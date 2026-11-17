import type { Metadata } from "next";
import Link from "next/link";

import { ArrowRightIcon, UploadIcon } from "@/components/icons";
import { CollectionCard } from "@/components/collection-card";
import { Container } from "@/components/ui/container";
import { orderCollectionCards } from "@/lib/collection-covers";
import { getAllCollections, getProductCount } from "@/lib/shopify/products";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Collections",
  description: "Shop Litwalls posters, organised by collection.",
  alternates: { canonical: absoluteUrl("/collections") },
};

/**
 * Which collection leads the grid.
 *
 * Shopify returns collections in its own order, so without this the first
 * card — the most-clicked slot on the page — goes to whichever collection
 * happens to sort first. Naming a handle makes it a merchandising decision. An
 * unknown handle (or none) leaves Shopify's order alone.
 */
const FEATURED_COLLECTION_HANDLE = process.env.NEXT_PUBLIC_FEATURED_COLLECTION;

export default async function CollectionsPage() {
  const [collections, total] = await Promise.all([
    getAllCollections(),
    getProductCount(),
  ]);

  const ordered = orderCollectionCards(collections, FEATURED_COLLECTION_HANDLE);

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
        <ul className="reveal-stagger mt-10 grid grid-cols-2 gap-3 sm:gap-6 lg:mt-12 lg:grid-cols-4">
          {ordered.map((collection) => (
            <li key={collection.id}>
              <CollectionCard collection={collection} headingLevel={2} />
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
