import "server-only";

import type { Review } from "@/components/home/reviews";

/**
 * The single place reviews come from.
 *
 * No reviews provider is connected yet, so this returns nothing — in every
 * environment, not just production. Every consumer already handles an empty
 * array (<Reviews> renders null, the hero shows no rating), so this degrades
 * to "no reviews section" rather than inventing one.
 *
 * To wire up for real: install Judge.me / Loox (or store reviews in a
 * metafield) and fetch them here.
 */
export async function getReviews(): Promise<Review[]> {
  return [];
}
