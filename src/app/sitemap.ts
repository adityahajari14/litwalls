import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";
import { getCollections, getProductHandles } from "@/lib/shopify/products";

/**
 * Every URL worth crawling, built from Shopify rather than maintained by hand.
 *
 * Products carry the highest priority because they are what long-tail search
 * actually lands on ("interstellar poster india"), and they change most often
 * — a poster going out of stock changes the page. The written pages are last:
 * they matter for trust, not for acquisition.
 *
 * Deliberately omitted: `/account` and `/search`. The first is per-customer and
 * behind a sign-in, and the second generates unbounded query-string URLs that
 * dilute the crawl budget across pages with no unique content of their own.
 */

/** Matches the ceiling the collection pages themselves prerender. */
const COLLECTION_COUNT = 50;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [handles, collections] = await Promise.all([
    getProductHandles(),
    getCollections(COLLECTION_COUNT),
  ]);

  const now = new Date();

  const products: MetadataRoute.Sitemap = handles.map((handle) => ({
    url: absoluteUrl(`/products/${handle}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const collectionPages: MetadataRoute.Sitemap = collections.map(
    (collection) => ({
      url: absoluteUrl(`/collections/${collection.handle}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  const staticPages: MetadataRoute.Sitemap = [
    { path: "/", priority: 1, changeFrequency: "daily" as const },
    { path: "/products", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/collections", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/custom", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/bulk", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/shipping", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/returns", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" as const },
  ].map(({ path, priority, changeFrequency }) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency,
    priority,
  }));

  return [...staticPages, ...collectionPages, ...products];
}
