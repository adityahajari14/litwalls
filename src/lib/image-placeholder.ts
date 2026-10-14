/**
 * The wash shown under a product image while it loads.
 *
 * Every catalogue image is remote (Shopify's CDN), so Next cannot derive a
 * blur placeholder the way it does for a static import — without one, a grid
 * loads as a field of flat grey rectangles that fill in one by one, which on a
 * slow connection reads as broken rather than loading.
 *
 * This is a 155-byte 8×10 PNG carrying a faint warm-neutral gradient in the
 * same family as the `ink-100`/`ink-200` frames it sits inside, inlined as a
 * data URI. Deliberately one shared image rather than a per-product blur:
 * generating a real blur for each product would mean either a build step over
 * the whole catalogue or an extra CDN request per card, and at the size these
 * are drawn the difference is a gradient nobody sees for more than a moment.
 *
 * Passed as `placeholder`, not `blurDataURL` — `next/image` accepts a
 * `data:image/…` value for `placeholder` directly, which avoids having to
 * declare `placeholder="blur"` and a separate data URI at every call site.
 */
export const IMAGE_PLACEHOLDER =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAKCAMAAAC+Ge+yAAAAHlBMVEXs6uju7Orq6Obo5uTn5ePr6efm5OLt6+nl4+Hk4uAA/k+0AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAI0lEQVR42j3BwREAIAjAsAoquP/CfnokLFFiHBEixRZXtHj6MJYBafoHgjoAAAAASUVORK5CYII=";
