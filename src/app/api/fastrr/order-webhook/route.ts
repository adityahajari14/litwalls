import { isFastrrOrderId } from "@/lib/checkout/fastrr-api";
import { ensureShopifyOrder } from "@/lib/checkout/fastrr-order";

/**
 * Shiprocket Checkout's order webhook — register this URL with them.
 *
 * Called when a checkout completes. It arrives unsigned, so the body is not
 * believed: only the order id is taken from it, and the order itself is then
 * fetched over the signed API (see fastrr-order.ts). Anyone can POST here; the
 * most they can do is make us re-check an order that is already genuine.
 *
 * The status code is the retry signal. 200 means "handled, don't send again",
 * including for a checkout that turned out not to be an order. A 5xx means we
 * could not reach Fastrr or Shopify — so that a retry, or failing that the
 * reconcile job, gets another go at it.
 */
export async function POST(request: Request) {
  let orderId: unknown;
  try {
    orderId = ((await request.json()) as { order_id?: unknown })?.order_id;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isFastrrOrderId(orderId)) {
    return Response.json({ ok: false, error: "Invalid order_id" }, { status: 400 });
  }

  try {
    const result = await ensureShopifyOrder(orderId);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error(`Fastrr order webhook failed for ${orderId}`, error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
