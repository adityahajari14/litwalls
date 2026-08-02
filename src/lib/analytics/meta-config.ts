/**
 * Meta Pixel configuration.
 *
 * Unlike lib/analytics/config.ts (Shopify's analytics, gated behind
 * HAS_USER_CONSENT), the Meta Pixel here is intentionally unconditional —
 * that was an explicit choice, not an oversight. If that changes, gate
 * MetaPixel's mount in components/analytics/meta-pixel.tsx, not here.
 */

/** From Meta Events Manager → Data Sources → your pixel. Public by nature —
    it appears in every page's rendered HTML and in the fbq() calls themselves. */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function isMetaPixelConfigured(): boolean {
  return Boolean(META_PIXEL_ID);
}
