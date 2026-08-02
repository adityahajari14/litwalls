import "server-only";

import type { Review } from "@/components/home/reviews";
import { PLACEHOLDER_REVIEWS } from "@/lib/placeholder-reviews";

/**
 * The single place reviews come from.
 *
 * Right now there is no reviews provider connected, so this returns invented
 * placeholder copy — and only in development. In production it returns nothing.
 *
 * That asymmetry is deliberate. Invented testimonials with "Verified purchase"
 * under them are not a design placeholder once they're on a live store; they
 * are false advertising, and in India they fall foul of the CCPA's 2022 dark
 * pattern guidelines. The design can still be built and reviewed locally, but
 * the fake reviews cannot escape onto litwalls.in by someone forgetting to
 * take them out.
 *
 * To wire up for real: install Judge.me / Loox (or store reviews in a
 * metafield), fetch them here, and delete src/lib/placeholder-reviews.ts along
 * with the branch below. Every consumer already handles an empty array.
 */
export async function getReviews(): Promise<Review[]> {
  if (process.env.NODE_ENV === "production") return [];
  return PLACEHOLDER_REVIEWS;
}
