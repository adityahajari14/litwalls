import {
  fastrrApiConfigured,
  listFastrrOrders,
} from "@/lib/checkout/fastrr-api";
import { ensureShopifyOrder } from "@/lib/checkout/fastrr-order";

/**
 * The failsafe behind the order webhook.
 *
 * Shiprocket's own advice: webhooks arrive "almost every time", so run a
 * periodic job as well. This walks Fastrr's recent successful orders and makes
 * sure each one exists in Shopify. Creating is idempotent, so running it over
 * orders the webhook already handled does nothing.
 *
 *   GET /api/fastrr/reconcile?hours=24
 *   Authorization: Bearer $CRON_SECRET
 *
 * vercel.json runs it daily (03:00 IST, 48h window — the most a Hobby plan allows). Vercel Cron sends exactly this
 * header when CRON_SECRET is set. Without the secret the route is off: it
 * would otherwise let anyone trigger a burst of Admin API calls.
 */

/** Fastrr keeps at most 250 per page; one page is days of orders here. */
const PAGE_LIMIT = 250;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || !fastrrApiConfigured()) {
    return Response.json({ ok: false, error: "Not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const requested = Number(new URL(request.url).searchParams.get("hours"));
  const hours = Math.min(24 * 14, Math.max(1, requested || 24));

  // Stops ten minutes short of now. An order that recent is the webhook's to
  // create, and arriving at the same moment is how one becomes two.
  const end = new Date(Date.now() - 10 * 60 * 1000);
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);

  try {
    const { total, orders } = await listFastrrOrders({
      start,
      end,
      limit: PAGE_LIMIT,
    });

    const summary = { checked: 0, created: 0, failed: 0 };
    const createdOrders: string[] = [];

    // One at a time: Shopify limits order creation, and nothing here is urgent.
    for (const { id } of orders) {
      summary.checked++;
      try {
        const result = await ensureShopifyOrder(id);
        if (result.status === "created") {
          summary.created++;
          createdOrders.push(result.shopifyOrder);
        }
      } catch (error) {
        summary.failed++;
        console.error(`Fastrr reconcile failed for ${id}`, error);
      }
    }

    return Response.json({
      ok: summary.failed === 0,
      ...summary,
      createdOrders,
      // More orders in the window than one page holds; run a shorter window.
      truncated: total > orders.length,
    });
  } catch (error) {
    console.error("Fastrr reconcile failed", error);
    return Response.json({ ok: false }, { status: 502 });
  }
}
