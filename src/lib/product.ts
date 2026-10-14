/**
 * Presentation helpers for a Shopify product that are not part of the raw API
 * shape (those live in `shopify/types.ts`). Plain functions, safe on the client.
 */

import type { Product } from "@/lib/shopify/types";

/**
 * The tag that marks a product as customer-uploaded artwork in Shopify.
 *
 * Custom products are ordinary Shopify products — real mockups, real variants,
 * real prices — that happen to be printed from a file the customer supplies.
 * The tag is the only thing separating them from the rest of the catalogue, so
 * it has to match exactly what is set in Shopify admin.
 */
export const CUSTOM_TAG = "custom";

/**
 * The tag marking a split-in-3 poster. These have their own bundle ladder,
 * counted in sets rather than panels, so both the cart and the product page
 * have to be able to tell them apart from ordinary posters.
 *
 * Lives here rather than in `shopify/products.ts` because that module is
 * `server-only` and the cart drawer — a client component — needs this to nudge
 * toward the right ladder.
 */
export const SPLIT_TAG = "split";

/**
 * Whether a product carries one of the marker tags above — compared exactly,
 * case and all, and that is deliberate.
 *
 * Shopify's own tag search (`tag:custom`) is case-insensitive, and the
 * catalogue's descriptive tags include "Custom" and "Split" on ordinary
 * posters (a custom livery, a split composition). Trusting the search alone
 * pulled those posters out of the main catalogue, listed them under "Design
 * your own", and counted them on the split-set bundle ladder. The lowercase
 * marker is the only thing that means what these helpers mean, so every
 * Shopify tag query is re-checked with them.
 */
export function isCustomProduct(product: { tags?: string[] }): boolean {
  return product.tags?.includes(CUSTOM_TAG) ?? false;
}

export function isSplitProduct(product: { tags?: string[] }): boolean {
  return product.tags?.includes(SPLIT_TAG) ?? false;
}

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
