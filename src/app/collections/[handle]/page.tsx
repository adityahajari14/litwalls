import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CollectionViewTracker } from "@/components/analytics/collection-view";
import { CatalogueToolbar } from "@/components/catalogue/catalogue-toolbar";
import { ProductFeed } from "@/components/catalogue/product-feed";
import { ArrowRightIcon } from "@/components/icons";
import { PosterFan } from "@/components/poster-fan";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { priceBand, priceBandsFor, sortOption } from "@/lib/catalogue";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { absoluteUrl } from "@/lib/site";
import type { Image as ShopifyImage } from "@/lib/shopify/types";
import {
  getCatalogueFacets,
  getCollectionProducts,
  getCollections,
} from "@/lib/shopify/products";

type Params = { handle: string };

const PAGE_SIZE = 24;

export async function generateStaticParams() {
  const collections = await getCollections(50);
  return collections.map((collection) => ({ handle: collection.handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await params;
  const result = await getCollectionProducts(handle, { first: 1 });

  if (!result) return { title: "Collection not found" };

  return {
    title: result.collection.title,
    description: result.collection.description.slice(0, 160),
    alternates: { canonical: absoluteUrl(`/collections/${handle}`) },
  };
}

/**
 * Full trail on desktop; on mobile just the one link back up.
 *
 * A shopper arriving on a collection from search or an ad had no visible route
 * anywhere except the header menu, because the whole trail was `hidden lg:block`
 * — and the single most useful link in it is the one going one level up.
 */
function Breadcrumb({ title }: { title: string }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-6 hidden lg:block">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
          <li>
            <Link href="/" className="transition-colors hover:text-ink-900">
              Home
            </Link>
          </li>
          <li aria-hidden className="text-ink-300">
            /
          </li>
          <li>
            <Link
              href="/collections"
              className="transition-colors hover:text-ink-900"
            >
              Collections
            </Link>
          </li>
          <li aria-hidden className="text-ink-300">
            /
          </li>
          <li aria-current="page" className="truncate text-ink-900">
            {title}
          </li>
        </ol>
      </nav>

      <Link
        href="/collections"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 transition-colors hover:text-ink-900 lg:hidden"
      >
        <ArrowRightIcon className="size-4 shrink-0 rotate-180" />
        All collections
      </Link>
    </>
  );
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ sort?: string; price?: string }>;
}) {
  const [{ handle }, { sort, price }] = await Promise.all([
    params,
    searchParams,
  ]);
  const option = sortOption(sort);

  const [result, facets, collections] = await Promise.all([
    getCollectionProducts(handle, { first: PAGE_SIZE, ...option.collection }),
    getCatalogueFacets(),
    // The same cached list the header uses — for the chip row, and for a
    // poster count and cover artwork that don't change with the sort order.
    getCollections(50),
  ]);

  if (!result) notFound();

  const { collection, products, hasNextPage, endCursor } = result;
  const bands = priceBandsFor(facets.priceMin, facets.priceMax);

  const summary = collections.find((entry) => entry.handle === handle);
  const covers: ShopifyImage[] =
    summary?.previews ??
    products
      .map((product) => product.featuredImage)
      .filter((image): image is ShopifyImage => image !== null)
      .slice(0, 3);
  const count = summary?.productCount ?? products.length;

  const cheapest = products.reduce<(typeof products)[number] | null>(
    (lowest, product) =>
      !lowest ||
      Number(product.priceRange.minVariantPrice.amount) <
        Number(lowest.priceRange.minVariantPrice.amount)
        ? product
        : lowest,
    null,
  );

  // Shopify's collection connection has no price filter, so a chosen band is
  // applied to the page we fetched rather than pretended away. The toolbar's
  // count reflects what is on screen for the same reason.
  const band = priceBand(price, bands);
  const visible = band
    ? products.filter((product) => {
        const amount = Number(product.priceRange.minVariantPrice.amount);
        return amount >= band.min && (band.max === null || amount <= band.max);
      })
    : products;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      {
        "@type": "ListItem",
        position: 2,
        name: "Collections",
        item: absoluteUrl("/collections"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: collection.title,
        item: absoluteUrl(`/collections/${collection.handle}`),
      },
    ],
  };

  return (
    <Container className="py-8 lg:py-12">
      <CollectionViewTracker collection={collection} products={products} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Breadcrumb title={collection.title} />

      {/* The collection's name on a dark band, with a few of its own posters
          leaning in from the corner — the same fan as its card on
          /collections, so arriving here feels like opening the card that was
          just clicked.

          This used to stretch one cover image across the whole band, which
          needs a landscape image per collection to look right. None is set in
          Shopify, so every collection fell back to a bare heading on the page
          background, and with a poster standing in as cover it would have
          been a portrait image cropped to a letterbox. */}
      <section className="relative isolate overflow-hidden rounded-card bg-ink-950">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(70%_120%_at_85%_0%,rgb(255_255_255/0.10),transparent_65%)]"
        />

        <div className="hero-enter flex flex-col justify-end p-7 sm:p-10 md:min-h-64 md:max-w-[56%] lg:min-h-80 lg:p-12">
          <p className="text-xs font-semibold tracking-[0.2em] text-brand-400 uppercase">
            Collection
          </p>
          <h1 className="mt-3 font-display text-5xl text-white sm:text-6xl lg:text-7xl">
            {collection.title}
          </h1>
          {collection.description ? (
            <p className="mt-3 max-w-xl text-sm text-white/70 text-pretty sm:text-base">
              {collection.description}
            </p>
          ) : null}
          {count > 0 ? (
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
              <span>
                <span className="font-semibold text-white">
                  {count >= 250 ? "250+" : count}
                </span>{" "}
                poster{count === 1 ? "" : "s"}
              </span>
              {cheapest ? (
                <>
                  <span aria-hidden className="size-1 rounded-full bg-white/30" />
                  <span>
                    From{" "}
                    <span className="font-semibold text-white">
                      {formatMoney(cheapest.priceRange.minVariantPrice)}
                    </span>
                  </span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        {/* Decorative, and tablet-up only: on a phone the grid of the same
            posters starts a thumb's length below, and a fan here would only
            push it further down. Hangs off the bottom edge on purpose. */}
        {covers.length > 0 ? (
          <div
            aria-hidden
            className="page-enter pointer-events-none absolute right-4 -bottom-12 hidden aspect-5/4 w-88 md:block lg:right-10 lg:w-md"
          >
            <PosterFan
              images={covers}
              title={collection.title}
              sizes="(min-width: 1024px) 13rem, 10rem"
              eager
            />
          </div>
        ) : null}
      </section>

      {/* Sideways between collections without going back up to the menu. */}
      {collections.length > 1 ? (
        <nav
          aria-label="Collections"
          className="no-scrollbar -mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          <ul className="flex w-max items-center gap-2">
            <li>
              <Link
                href="/products"
                className="inline-flex min-h-9 items-center rounded-full border border-ink-200 px-4 text-[13px] font-medium text-ink-700 transition-colors hover:border-ink-950 hover:text-ink-950"
              >
                All posters
              </Link>
            </li>
            {collections.map((entry) => {
              const active = entry.handle === collection.handle;
              return (
                <li key={entry.id}>
                  <Link
                    href={`/collections/${entry.handle}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-9 items-center rounded-full border px-4 text-[13px] font-medium transition-colors",
                      active
                        ? "border-ink-950 bg-ink-950 text-white"
                        : "border-ink-200 text-ink-700 hover:border-ink-950 hover:text-ink-950",
                    )}
                  >
                    {entry.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      {products.length === 0 ? (
        <div className="mt-12">
          <p className="text-ink-600">Nothing in this collection yet.</p>
          <ButtonLink href="/products" variant="ghost" className="mt-4">
            Browse all posters
          </ButtonLink>
        </div>
      ) : (
        <Suspense fallback={<div className="mt-6 h-32" />}>
          <div className="mt-6">
            <CatalogueToolbar
              showing={visible.length}
              // A price band filters the page that was fetched, so "of N" is
              // only true while no band is active.
              total={band ? undefined : { count, atLeast: count >= 250 }}
              bands={bands}
            />
          </div>

          <div className="mt-10">
            {visible.length === 0 ? (
              <div className="py-4">
                <p className="text-ink-900">
                  Nothing in this collection is in that price range.
                </p>
                <ButtonLink
                  href={`/collections/${collection.handle}`}
                  variant="ghost"
                  className="mt-4"
                >
                  Clear filter
                </ButtonLink>
              </div>
            ) : (
              <ProductFeed
                key={`${sort ?? ""}|${price ?? ""}`}
                initialProducts={visible}
                initialCursor={endCursor}
                initialHasNextPage={hasNextPage}
                pageSize={PAGE_SIZE}
                collectionHandle={collection.handle}
              />
            )}
          </div>
        </Suspense>
      )}
    </Container>
  );
}
