import type { Metadata } from "next";
import Link from "next/link";

import { ArrowRightIcon, UploadIcon } from "@/components/icons";
import { PosterFan } from "@/components/poster-fan";
import { Container } from "@/components/ui/container";
import { getCollections, getProductCount } from "@/lib/shopify/products";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Collections",
  description: "Shop Litwalls posters, organised by collection.",
  alternates: { canonical: absoluteUrl("/collections") },
};

/** Same ceiling as the collection page's generateStaticParams — one list, one limit. */
const COLLECTION_COUNT = 50;

/**
 * Which collection leads the grid.
 *
 * Shopify returns collections in its own order, so without this the first
 * card — the most-clicked slot on the page — goes to whichever collection
 * happens to sort first. Naming a handle makes it a merchandising decision. An
 * unknown handle (or none) leaves Shopify's order alone.
 */
const FEATURED_COLLECTION_HANDLE = process.env.NEXT_PUBLIC_FEATURED_COLLECTION;

function posterCount(count: number) {
  return `${count >= 250 ? "250+" : count} poster${count === 1 ? "" : "s"}`;
}

export default async function CollectionsPage() {
  const [collections, total] = await Promise.all([
    getCollections(COLLECTION_COUNT),
    getProductCount(),
  ]);

  const featuredIndex = FEATURED_COLLECTION_HANDLE
    ? collections.findIndex(
        (collection) => collection.handle === FEATURED_COLLECTION_HANDLE,
      )
    : -1;

  const ordered =
    featuredIndex > 0
      ? [
          collections[featuredIndex],
          ...collections.filter((_, index) => index !== featuredIndex),
        ]
      : collections;

  return (
    <Container className="py-12 lg:py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand-600 uppercase">
          Browse
        </p>
        <h1 className="mt-3 font-display text-5xl text-ink-950 sm:text-6xl">
          Collections
        </h1>
        <p className="mt-3 text-ink-600 text-pretty">
          Every poster, grouped so you can jump straight to the wall you&apos;re
          after.
        </p>
      </header>

      {collections.length === 0 ? (
        <p className="mt-12 text-ink-600">
          No collections yet. Add some in your Shopify admin and they&apos;ll
          appear here.
        </p>
      ) : (
        // Each card is a small stack of the collection's own posters on a
        // quiet ground, with its name beneath — the artwork is the cover.
        // These were full-bleed tiles with the title over a dark scrim, which
        // needs a cover image per collection to work; none is set in Shopify,
        // so every tile was a single letter on black.
        <ul className="reveal-stagger mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-6">
          {ordered.map((collection, index) => (
            <li key={collection.id}>
              <Link
                href={`/collections/${collection.handle}`}
                className="group block h-full overflow-hidden rounded-card bg-white shadow-card ring-1 ring-ink-950/5 transition duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="relative aspect-5/4 overflow-hidden bg-linear-to-b from-ink-50 to-ink-200/70">
                  <PosterFan
                    images={collection.previews}
                    title={collection.title}
                    eager={index < 3}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 p-5 sm:p-6">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-3xl text-ink-950 transition-colors duration-300 group-hover:text-brand-600">
                      {collection.title}
                    </h2>
                    <p className="mt-0.5 text-sm text-ink-500">
                      {posterCount(collection.productCount)}
                    </p>
                  </div>
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-950 text-white transition duration-300 ease-out-soft group-hover:bg-brand-500">
                    <ArrowRightIcon className="size-4.5 transition-transform duration-300 ease-out-soft group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* The two ways through the catalogue that aren't a collection. With a
          handful of collections the page used to end right after the grid,
          and someone who wanted none of them had nowhere to go but back. */}
      <div className="reveal mt-6 grid gap-5 sm:grid-cols-2 lg:mt-8 lg:gap-6">
        <Link
          href="/products"
          className="group flex items-center justify-between gap-6 rounded-card bg-ink-950 p-6 text-white transition duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-lift sm:p-8"
        >
          <div>
            <p className="font-display text-3xl">All posters</p>
            <p className="mt-1 text-sm text-ink-300 text-pretty">
              {total.count > 0
                ? `Browse all ${total.atLeast ? `${total.count}+` : total.count} prints in one place.`
                : "Browse every print in one place."}
            </p>
          </div>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 transition duration-300 ease-out-soft group-hover:bg-brand-500">
            <ArrowRightIcon className="size-4.5 transition-transform duration-300 ease-out-soft group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link
          href="/custom"
          className="group flex items-center justify-between gap-6 rounded-card bg-white p-6 ring-1 ring-ink-200 transition duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-lift sm:p-8"
        >
          <div>
            <p className="font-display text-3xl text-ink-950">Design your own</p>
            <p className="mt-1 text-sm text-ink-600 text-pretty">
              Upload a photo or artwork and we&apos;ll print it for you.
            </p>
          </div>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-900 transition duration-300 ease-out-soft group-hover:bg-brand-500 group-hover:text-white">
            <UploadIcon className="size-4.5" />
          </span>
        </Link>
      </div>
    </Container>
  );
}
