import type { Review } from "@/components/home/reviews";

/**
 * ⚠️ PLACEHOLDER CONTENT — NOT REAL REVIEWS. DELETE THIS FILE. ⚠️
 *
 * These exist so the reviews section can be designed and reviewed before a
 * reviews app is connected. They are invented, and shipping them to a live
 * store is dishonest and, in India, actionable under the CCPA's 2022 dark
 * patterns guidelines.
 *
 * To replace: install Judge.me / Loox (or store reviews in a metafield), fetch
 * them, and pass the real array into <Reviews reviews={...} />. Then delete
 * this file — <Reviews> already renders nothing when handed an empty array, so
 * removing the import degrades gracefully.
 */
export const PLACEHOLDER_REVIEWS: Review[] = [
  {
    name: "Ananya R.",
    location: "Bengaluru",
    rating: 5,
    title: "Thicker than I expected, in a good way",
    body: "Ordered the Spider-Man A3 half expecting the flimsy paper you get on marketplaces. This is proper card stock — it went straight onto the wall with mounting tape and hasn't curled at the corners once.",
    product: "Spider-Man — Across the Spider-Verse",
  },
  {
    name: "Karthik M.",
    location: "Chennai",
    rating: 5,
    title: "The colours are actually right",
    body: "I've bought prints where the blacks come out grey and the whole thing looks washed. Not here. Deep blacks, no glare from the window behind my desk, which was the entire reason I wanted matte.",
    product: "Travis Scott — Utopia",
  },
  {
    name: "Simran K.",
    location: "Delhi",
    rating: 4,
    title: "Fast, well packed, one small gripe",
    body: "Shipped the same evening and arrived in three days in a rigid tube, no dents. Only note is I wish the A4 came with mounting strips in the box — minor, and I'd order again.",
    product: "Iron Man — Mark LXXXV",
  },
];
