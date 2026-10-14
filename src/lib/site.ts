/**
 * The canonical origin, in one place.
 *
 * `metadataBase` in the root layout, the sitemap, robots.txt and the product
 * JSON-LD all have to agree on this — they were previously three separate
 * hardcoded copies of "https://litwalls.in", which is exactly how a staging
 * deploy ends up publishing a sitemap full of production URLs.
 *
 * Falls back to the production origin so a build without the env var still
 * emits correct absolute URLs rather than `undefined/products/…`.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://litwalls.in"
).replace(/\/$/, "");

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
