/**
 * Presentation helpers for a Shopify product that are not part of the raw API
 * shape (those live in `shopify/types.ts`). Plain functions, safe on the client.
 */

import type { Product } from "@/lib/shopify/types";

/** Section tags the catalogue is organised by, richest label first. */
const SECTION_TAGS = ["Marvel", "DC", "Music", "Movies", "Series"] as const;

/**
 * A human category to show as the PDP eyebrow and a breadcrumb segment.
 *
 * Every product is titled `Name … | X Posters`, so the suffix after the last
 * pipe is the most specific label available — `productType` is empty on the
 * live catalogue. Falls back to a known section tag, then `productType`, then
 * nothing (the eyebrow simply doesn't render).
 */
export function productCategory(product: Product): string | null {
  const pipe = product.title.lastIndexOf("|");
  if (pipe !== -1) {
    const suffix = product.title.slice(pipe + 1).trim();
    if (suffix) return suffix;
  }

  const section = SECTION_TAGS.find((tag) => product.tags.includes(tag));
  if (section) return `${section} Posters`;

  return product.productType || null;
}

/**
 * The title with its trailing ` | X Posters` suffix removed, for use as the
 * on-page `h1`. The full `product.title` is still what feeds `<title>`,
 * OpenGraph and the Product schema — this is a display-only trim.
 */
export function displayTitle(product: Product): string {
  const pipe = product.title.lastIndexOf("|");
  if (pipe === -1) return product.title;
  const head = product.title.slice(0, pipe).trim();
  return head || product.title;
}
