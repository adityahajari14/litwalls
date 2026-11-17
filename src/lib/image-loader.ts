"use client";

/**
 * Builds image URLs for every `next/image` on the site, so no image goes
 * through Vercel's `/_next/image` optimizer.
 *
 * Why: Vercel bills image optimization per source image and transformation.
 * When the plan's quota ran out, every size Vercel hadn't already cached
 * started returning 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED, which left
 * the product gallery blank on the live site (2026-11-18). The images were
 * fine at the source the whole time.
 *
 * - Shopify CDN resizes for free with `?width=` and serves WebP/AVIF to
 *   browsers that accept them (it varies on `Accept`). A 5.7 MB mockup PNG
 *   comes back as about 90 KB of WebP at 1080px.
 * - Judge.me review photos sit on imgix, which takes `w`, `q` and
 *   `auto=format`.
 * - Our own files in /public are already sized WebP and are served as they
 *   are. The `w` parameter is ignored by the static server; it is there so
 *   each srcset entry is a distinct URL, which is what next/image expects a
 *   loader to return.
 *
 * Images that set `unoptimized` (the animated logo, the hero carousel) never
 * reach this function, and neither do data: or blob: sources.
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (src.startsWith("/")) {
    return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
  }

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }

  if (url.hostname === "cdn.shopify.com") {
    url.searchParams.set("width", String(width));
    return url.toString();
  }

  if (
    url.hostname === "judgeme-public-images.imgix.net" ||
    url.hostname === "pub-images.judge.me"
  ) {
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? 75));
    url.searchParams.set("auto", "format");
    return url.toString();
  }

  return src;
}
