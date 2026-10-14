"use client";

import { isMetaPixelConfigured } from "@/lib/analytics/meta-config";
import type { PurchaseSummary } from "@/lib/analytics/purchase";
import type { Cart, Collection, Product, ProductVariant } from "@/lib/shopify/types";

declare global {
  interface Window {
    /**
     * Installed by the base pixel script (components/analytics/meta-pixel.tsx).
     * The base code itself defines a queueing stub before fbevents.js has
     * loaded, so calling this immediately after mount is always safe — calls
     * queue and replay once the real script arrives.
     */
    fbq?: (...args: unknown[]) => void;
  }
}

function fbq(...args: unknown[]) {
  if (!isMetaPixelConfigured()) return;
  window.fbq?.(...args);
}

/**
 * Fired once per client-side navigation by MetaPixel — mirrors what the base
 * install's own inline `fbq('track', 'PageView')` does for the very first
 * load, but that call only runs once at script-insertion time, so every route
 * change after that needs its own call or Meta only ever sees one page view
 * per session.
 */
export function trackMetaPageView() {
  fbq("track", "PageView");
}

/**
 * ViewContent — the PDP counterpart of Shopify's PRODUCT_VIEW and GA4's
 * view_item. This is the event Meta's dynamic-ads retargeting keys on, so the
 * content_ids here must match the ids in the catalog feed (per-variant, see
 * trackMetaAddToCart).
 */
export function trackMetaViewContent(
  product: Product,
  variant: ProductVariant | null,
) {
  const price = variant?.price ?? product.priceRange.minVariantPrice;

  fbq("track", "ViewContent", {
    content_ids: [variant?.id ?? product.id],
    content_type: "product",
    content_name: product.title,
    content_category: product.productType || undefined,
    contents: [{ id: variant?.id ?? product.id, quantity: 1 }],
    currency: price.currencyCode,
    value: Number(price.amount),
  });
}

/**
 * Search — mirrors Shopify's SEARCH_VIEW / GA4's `search`. Meta uses this to
 * build search-intent audiences.
 */
export function trackMetaSearch(searchString: string) {
  fbq("track", "Search", { search_string: searchString });
}

/**
 * A collection landing. Meta has no standard event for a category page, so
 * this is a custom event (`trackCustom`) — it still feeds custom audiences and
 * conversion rules, it just won't appear under the standard-event reports.
 */
export function trackMetaViewCategory(
  collection: Collection,
  products: Product[],
) {
  fbq("trackCustom", "ViewCategory", {
    content_name: collection.title,
    content_category: collection.handle,
    content_type: "product_group",
    content_ids: products.slice(0, 10).map((product) => product.id),
  });
}

/**
 * content_ids uses the variant's Shopify GID, not the product's — Meta's
 * catalog matching (for dynamic/retargeting ads) is per-variant, and this
 * store's Storefront catalog feed is also keyed on variant id.
 */
export function trackMetaAddToCart(
  product: Product,
  variant: ProductVariant | null,
  quantity: number,
) {
  const price = variant?.price ?? product.priceRange.minVariantPrice;

  fbq("track", "AddToCart", {
    content_ids: [variant?.id ?? product.id],
    content_type: "product",
    content_name: product.title,
    contents: [{ id: variant?.id ?? product.id, quantity }],
    currency: price.currencyCode,
    value: Number(price.amount) * quantity,
  });
}

/**
 * Fired the moment a customer is handed off to Shopify's checkout — the last
 * page view this app ever sees for that order, and the one Meta needs to
 * attribute an eventual Purchase (tracked separately, on Shopify's own domain,
 * outside this app's reach) back to the ad that brought them here.
 */
export function trackMetaInitiateCheckout(cart: Cart) {
  const lines = cart.lines.nodes;

  fbq("track", "InitiateCheckout", {
    content_ids: lines.map((line) => line.merchandise.id),
    contents: lines.map((line) => ({
      id: line.merchandise.id,
      quantity: line.quantity,
    })),
    num_items: cart.totalQuantity,
    currency: cart.cost.totalAmount.currencyCode,
    value: Number(cart.cost.totalAmount.amount),
  });
}

/**
 * Purchase — for an order placed through the Fastrr overlay, fired from the
 * confirmation page on this domain.
 *
 * Orders that go through Shopify's hosted checkout are reported by the Shopify
 * custom pixel instead (shopify/custom-pixel.js). The two never overlap: a
 * Fastrr order is written into Shopify through the Admin API, which does not
 * run a checkout and so never fires that pixel. `eventID` lets Meta discard a
 * repeat if this page is ever reloaded past the client-side guard.
 */
export function trackMetaPurchase(order: PurchaseSummary) {
  fbq(
    "track",
    "Purchase",
    {
      content_ids: order.items.map((item) => item.variantGid),
      content_type: "product",
      contents: order.items.map((item) => ({
        id: item.variantGid,
        quantity: item.quantity,
      })),
      num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
      currency: order.currency,
      value: order.value,
    },
    { eventID: order.orderId },
  );
}
