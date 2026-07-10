/**
 * Shopify analytics needs these in the browser, so unlike lib/shopify/env.ts
 * they must be NEXT_PUBLIC_. All three are public identifiers (they appear in
 * any storefront's page source) — the Storefront access token stays server-only.
 *
 * Values come from Shopify admin → Sales channels → Headless → your storefront.
 * See README.md. When shopId is unset every event no-ops rather than throwing,
 * so a missing var degrades to silence instead of breaking the page.
 */

function normalizeDomain(domain: string | undefined) {
  return domain?.replace(/^https?:\/\//, "").replace(/\/$/, "") || undefined;
}

function normalizeShopId(id: string | undefined) {
  if (!id) return undefined;
  return id.startsWith("gid://shopify/Shop/") ? id : `gid://shopify/Shop/${id}`;
}

/** The myshopify.com domain the analytics collector lives on. */
export const SHOP_DOMAIN = normalizeDomain(
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN,
);

export const SHOP_ID = normalizeShopId(process.env.NEXT_PUBLIC_SHOPIFY_SHOP_ID);

export const STOREFRONT_ID = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ID;

/**
 * Checkout runs on orders.litwalls.in while the storefront runs on
 * litwalls.in. useShopifyCookies walks both to their shared parent
 * (litwalls.in) and scopes _shopify_y / _shopify_s there, which is what lets
 * a session survive the hop into checkout. Point this at the wrong host and
 * every conversion arrives unattributed.
 */
export const CHECKOUT_DOMAIN =
  normalizeDomain(process.env.NEXT_PUBLIC_SHOPIFY_CHECKOUT_DOMAIN) ?? SHOP_DOMAIN;

/** Opt-out, not opt-in: absent means consented. Flip to "false" behind a banner. */
export const HAS_USER_CONSENT =
  process.env.NEXT_PUBLIC_SHOPIFY_ANALYTICS_HAS_USER_CONSENT !== "false";

export const ACCEPTED_LANGUAGE = "EN";

/** Analytics is configured only when the collector can attribute the event. */
export function isConfigured(): boolean {
  return Boolean(SHOP_ID && SHOP_DOMAIN);
}

export function logAnalyticsError(error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.warn("Shopify analytics event failed", error);
  }
}
