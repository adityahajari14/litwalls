import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CollectionViewTracker } from "@/components/analytics/collection-view";
import { CollectionBanner } from "@/components/catalogue/collection-banner";
import { CollectionToolbar } from "@/components/catalogue/collection-toolbar";
import { ProductFeed } from "@/components/catalogue/product-feed";
import { ArrowRightIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { DEFAULT_SORT, sortOption } from "@/lib/catalogue";
import { getCollectionListing } from "@/lib/collection-catalogue";
import { collectionSubjectLabel } from "@/lib/collection-filters";
import { cn } from "@/lib/cn";
import { absoluteUrl } from "@/lib/site";
import type { Image as ShopifyImage } from "@/lib/shopify/types";
import {
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
  searchParams: Promise<{ sort?: string | string[]; subject?: string | string[]; format?: string | string[] }>;
}) {
  const [{ handle }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const sort = first(query.sort);
  const subject = first(query.subject);
  const format = first(query.format);
  const option = sortOption(sort);

  const [result, collections] = await Promise.all([
    getCollectionListing(handle, { sort, subject, format, pageSize: PAGE_SIZE }),
    // The same cached list the header uses — for the chip row, and for a
    // poster count and cover artwork that don't change with the sort order.
    getCollections(50),
  ]);

  if (!result) notFound();

  const { collection, allProducts: products, products: visible, hasNextPage, endCursor } = result;

  const summary = collections.find((entry) => entry.handle === handle);
  const covers: ShopifyImage[] =
    summary?.previews ??
    products
      .map((product) => product.featuredImage)
      .filter((image): image is ShopifyImage => image !== null)
      .slice(0, 3);
  const count = products.length;

  const cheapest = products.reduce<(typeof products)[number] | null>(
    (lowest, product) =>
      !lowest ||
      Number(product.priceRange.minVariantPrice.amount) <
        Number(lowest.priceRange.minVariantPrice.amount)
        ? product
        : lowest,
    null,
  );

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
      <CollectionViewTracker collection={collection} products={visible} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Breadcrumb title={collection.title} />

      <CollectionBanner
        handle={collection.handle}
        title={collection.title}
        description={collection.description}
        count={count}
        startingPrice={cheapest?.priceRange.minVariantPrice}
        previews={covers}
      />

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
            <CollectionToolbar
              key={handle}
              count={result.total}
              subjects={result.subjects}
              formats={result.formats}
              subjectLabel={collectionSubjectLabel(handle)}
              subjectTotal={result.subjectTotal}
              formatTotal={result.formatTotal}
              activeSubject={result.subject}
              activeFormat={result.format}
            />
          </div>

          <div className="mt-10">
            {visible.length === 0 ? (
              <div className="py-4">
                <p className="text-ink-900">
                  No prints match these filters.
                </p>
                <ButtonLink
                  href={`/collections/${collection.handle}${option.value === DEFAULT_SORT.value ? "" : `?sort=${option.value}`}`}
                  variant="ghost"
                  className="mt-4"
                >
                  Clear filter
                </ButtonLink>
              </div>
            ) : (
              <ProductFeed
                key={`${option.value}|${result.subject ?? ""}|${result.format ?? ""}`}
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
