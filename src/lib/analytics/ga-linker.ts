"use client";

import {
  GA_MEASUREMENT_ID,
  isGoogleAnalyticsConfigured,
} from "@/lib/analytics/google-config";

/**
 * Cross-domain stitching for GA4.
 *
 * The storefront runs on litwalls.in; Shopify's checkout runs on
 * orders.litwalls.in and is served by Shopify, not this app. gtag.js scopes
 * its `_ga` cookie (the client id) to the exact host that set it, so a fresh
 * gtag load inside checkout invents a NEW client id — GA4 then counts the
 * buyer as a second, unattributed user and the `purchase` never joins the
 * session that drove it.
 *
 * GA's own answer is the `_gl` linker param, but its value is a hashed blob
 * that only Google's script can produce or read. Instead we hand our own
 * `ga_cid` / `ga_sid` params to the checkout URL and read them back in the
 * Shopify custom pixel (shopify/custom-pixel.js), which sets them explicitly
 * on the `purchase` event. Same outcome, fully under our control.
 */

let clientId: string | null = null;
let sessionId: string | null = null;

/**
 * Ask gtag for the ids once it has loaded and cache them. Safe to call before
 * gtag.js finishes loading — the `get` command queues and the callback fires
 * on load. Called from the GoogleAnalytics component's mount effect.
 */
export function primeGaLinker() {
  if (!isGoogleAnalyticsConfigured() || typeof window === "undefined") return;

  window.gtag?.("get", GA_MEASUREMENT_ID, "client_id", (value: unknown) => {
    if (typeof value === "string") clientId = value;
  });
  window.gtag?.("get", GA_MEASUREMENT_ID, "session_id", (value: unknown) => {
    if (typeof value === "string" || typeof value === "number") {
      sessionId = String(value);
    }
  });
}

/**
 * Append the cached GA ids to a checkout URL. A no-op until `primeGaLinker`'s
 * callbacks have resolved, or when GA is not configured — the URL is returned
 * untouched, never broken.
 */
export function withGaLinker(checkoutUrl: string): string {
  if (!clientId) return checkoutUrl;

  try {
    const url = new URL(checkoutUrl);
    url.searchParams.set("ga_cid", clientId);
    if (sessionId) url.searchParams.set("ga_sid", sessionId);
    return url.toString();
  } catch {
    return checkoutUrl;
  }
}
