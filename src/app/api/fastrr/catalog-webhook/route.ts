import { createHmac, timingSafeEqual } from "node:crypto";

import { fastrrApiConfigured, pushCatalogUpdate } from "@/lib/checkout/fastrr-api";
import {
  fromShopifyWebhookCollection,
  fromShopifyWebhookProduct,
  type ShopifyWebhookCollection,
  type ShopifyWebhookProduct,
} from "@/lib/checkout/fastrr-catalog";

/**
 * Keeps Fastrr's copy of the catalogue current between its full syncs.
 *
 * Shopify calls this when a product or collection changes; it is translated
 * and passed on to Fastrr's catalogue webhook. Point Shopify at it from
 * Settings → Notifications → Webhooks, for these four events, JSON format:
 *
 *   Product creation · Product update · Collection creation · Collection update
 *
 * and copy the signing secret shown on that page into SHOPIFY_WEBHOOK_SECRET.
 *
 * Unlike Fastrr's order webhook, this one IS signed, and the signature is
 * enforced: without it anyone could rewrite the names and images the checkout
 * shows. (Not the prices — those are sent with every checkout; see
 * fastrr-cart.ts.)
 */

function verified(body: string, signature: string | null, secret: string) {
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(signature, "base64");

  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!secret || !fastrrApiConfigured()) {
    return Response.json({ ok: false, error: "Not configured" }, { status: 503 });
  }

  // The raw bytes, exactly as sent: the signature covers those, and a
  // parse-and-reserialise round trip would not reproduce them.
  const body = await request.text();

  if (!verified(body, request.headers.get("x-shopify-hmac-sha256"), secret)) {
    return Response.json({ ok: false, error: "Bad signature" }, { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic") ?? "";

  try {
    const payload: unknown = JSON.parse(body);

    if (topic === "products/create" || topic === "products/update") {
      await pushCatalogUpdate(
        "product",
        fromShopifyWebhookProduct(payload as ShopifyWebhookProduct),
      );
    } else if (topic === "collections/create" || topic === "collections/update") {
      await pushCatalogUpdate(
        "collection",
        fromShopifyWebhookCollection(payload as ShopifyWebhookCollection),
      );
    }
    // Any other topic is acknowledged and ignored, so a webhook pointed here
    // by mistake does not sit in Shopify's retry queue for two days.

    return Response.json({ ok: true });
  } catch (error) {
    // Non-2xx on purpose: Shopify retries, which is the behaviour wanted when
    // Fastrr was briefly unreachable.
    console.error(`Fastrr catalogue push failed (${topic})`, error);
    return Response.json({ ok: false }, { status: 502 });
  }
}
