/**
 * Google Analytics 4 (gtag.js) configuration.
 *
 * Like the Meta Pixel (meta-config.ts) and unlike lib/analytics/config.ts
 * (Shopify's analytics, gated behind HAS_USER_CONSENT), GA here is
 * intentionally unconditional. If that changes, gate GoogleAnalytics's mount
 * in components/analytics/google-analytics.tsx, not here — one place decides
 * whether GA ever loads at all.
 */

/** From Google Analytics → Admin → Data streams → your web stream
    ("Measurement ID", G-XXXXXXXXXX). Public by nature — it appears in every
    page's rendered HTML and in the gtag() calls themselves. */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export function isGoogleAnalyticsConfigured(): boolean {
  return Boolean(GA_MEASUREMENT_ID);
}
