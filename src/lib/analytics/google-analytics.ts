"use client";

import { isGoogleAnalyticsConfigured } from "@/lib/analytics/google-config";
import type { Cart, Product, ProductVariant } from "@/lib/shopify/types";

declare global {
  interface Window {
    dataLayer?: unknown[];
    /**
     * Installed by the base gtag.js snippet
     * (components/analytics/google-analytics.tsx). That snippet defines a
     * synchronous stub which pushes onto dataLayer before gtag/js.js has
     * loaded, so calling this immediately after mount is always safe — calls
     * queue and replay once the real script arrives.
     */
    gtag?: (...args: unknown[]) => void;
  }
}

function gtag(...args: unknown[]) {
  if (!isGoogleAnalyticsConfigured()) return;
  window.gtag?.(...args);
}

/**
 * GA4 item_id wants a short, stable SKU-like string, not the full
 * `gid://shopify/ProductVariant/123` GID. The trailing number is what Shopify's
 * own GA4 integration and Merchant Center feeds key on, so matching it here is
 * what lets GA join a storefront `add_to_cart` to a checkout `purchase`.
 */
function numericId(gid: string): string {
  return gid.split("/").pop() || gid;
}

type GaItem = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity: number;
};

function gaItem(
  product: Product,
  variant: ProductVariant | null,
  quantity = 1,
  index?: number,
): GaItem & { index?: number } {
  const price = variant?.price ?? product.priceRange.minVariantPrice;

  return {
    item_id: numericId(variant?.id ?? product.id),
    item_name: product.title,
    item_brand: product.vendor || undefined,
    item_category: product.productType || undefined,
    item_variant: variant?.title,
    price: Number(price.amount),
    quantity,
    ...(index === undefined ? {} : { index }),
  };
}

/**
 * Fired once per client-side navigation by GoogleAnalytics — mirrors the
 * page_view the base install's own `gtag('config', ...)` sends for the very
 * first load, but that call only runs once at script-insertion time, so every
 * route change after that needs its own event or GA only ever records one
 * page view per session.
 */
export function trackGaPageView(url: string) {
  gtag("event", "page_view", {
    page_path: url,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/** GA4 `view_item` — the PDP counterpart of Shopify's PRODUCT_VIEW. */
export function trackGaViewItem(product: Product, variant: ProductVariant | null) {
  const price = variant?.price ?? product.priceRange.minVariantPrice;

  gtag("event", "view_item", {
    currency: price.currencyCode,
    value: Number(price.amount),
    items: [gaItem(product, variant)],
  });
}

/**
 * GA4 `view_item_list` — a collection or search results page. `listName` is
 * what GA groups the impressions under (the collection title, or `Search: …`).
 */
export function trackGaViewItemList(products: Product[], listName: string) {
  if (products.length === 0) return;

  gtag("event", "view_item_list", {
    item_list_name: listName,
    items: products.map((product, index) => gaItem(product, null, 1, index)),
  });
}

export function trackGaAddToCart(
  product: Product,
  variant: ProductVariant | null,
  quantity: number,
) {
  const price = variant?.price ?? product.priceRange.minVariantPrice;

  gtag("event", "add_to_cart", {
    currency: price.currencyCode,
    value: Number(price.amount) * quantity,
    items: [gaItem(product, variant, quantity)],
  });
}

/**
 * GA4 `begin_checkout` — fired the moment the customer is handed to Shopify's
 * hosted checkout. The `purchase` that eventually follows is emitted by the
 * Shopify custom pixel (shopify/custom-pixel.js), on Shopify's own domain,
 * which is the only place this app's code cannot run.
 */
export function trackGaBeginCheckout(cart: Cart) {
  gtag("event", "begin_checkout", {
    currency: cart.cost.totalAmount.currencyCode,
    value: Number(cart.cost.totalAmount.amount),
    items: cart.lines.nodes.map((line) => ({
      item_id: numericId(line.merchandise.id),
      item_name: line.merchandise.product.title,
      item_variant: line.merchandise.title,
      price: Number(line.merchandise.price.amount),
      quantity: line.quantity,
    })),
  });
}

/** GA4 `search` — the storefront counterpart of Shopify's SEARCH_VIEW. */
export function trackGaSearch(term: string) {
  gtag("event", "search", { search_term: term });
}
