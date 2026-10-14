import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogueToolbar } from "@/components/catalogue/catalogue-toolbar";
import { ProductFeed } from "@/components/catalogue/product-feed";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import {
  buildProductQuery,
  hasActiveFilters,
  priceBandsFor,
  sortOption,
} from "@/lib/catalogue";
import {
  getCatalogueFacets,
  getCataloguePage,
  getProductCount,
} from "@/lib/shopify/products";

export const metadata: Metadata = {
  title: "All posters",
  description: "Every Litwalls poster, printed on 300gsm matte paper.",
};

/** One server page. Four columns at the widest step, so this is six full rows. */
const PAGE_SIZE = 24;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; size?: string; price?: string }>;
}) {
  const { sort, size, price } = await searchParams;
  const option = sortOption(sort);

  // Facets first: the query depends on which filters are real, so a value from
  // a stale bookmark can't produce a query that matches nothing.
  const [facets, total] = await Promise.all([
    getCatalogueFacets(),
    getProductCount(),
  ]);
  const bands = priceBandsFor(facets.priceMin, facets.priceMax);

  const page = await getCataloguePage({
    first: PAGE_SIZE,
    query: buildProductQuery({ size, price, sizes: facets.sizes, bands }),
    ...option.product,
  });

  const filtered = hasActiveFilters({ size, price, sizes: facets.sizes, bands });

  return (
    <Container className="py-12 lg:py-16">
      <header className="max-w-2xl">
        <h1 className="font-display text-5xl text-ink-950 sm:text-6xl">
          All posters
        </h1>
        <p className="mt-3 text-ink-600 text-pretty">
          Every print we make, on 300gsm matte paper. Mix and match any designs
          — the bundle discount applies across the whole catalogue.
        </p>
      </header>

      {/* useSearchParams inside the toolbar and feed opts them out of
          prerendering; the boundary keeps that from reaching the header above. */}
      <Suspense fallback={<div className="mt-10 h-32" />}>
        <div className="mt-10">
          <CatalogueToolbar
            total={total}
            showing={page.products.length}
            sizes={facets.sizes}
            bands={bands}
          />
        </div>

        <div className="mt-10">
          {page.products.length === 0 ? (
            <div className="py-8">
              <p className="text-ink-900">
                {filtered
                  ? "No posters match those filters."
                  : "No products yet."}
              </p>
              <p className="mt-1 text-ink-600 text-pretty">
                {filtered
                  ? "Try widening the price range or clearing the size."
                  : "Add some in your Shopify admin and they'll appear here."}
              </p>
              {filtered ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  <ButtonLink href="/products" variant="ghost">
                    Clear filters
                  </ButtonLink>
                  <ButtonLink href="/custom">Make a custom poster</ButtonLink>
                </div>
              ) : null}
            </div>
          ) : (
            <ProductFeed
              key={`${sort ?? ""}|${size ?? ""}|${price ?? ""}`}
              initialProducts={page.products}
              initialCursor={page.endCursor}
              initialHasNextPage={page.hasNextPage}
              pageSize={PAGE_SIZE}
            />
          )}
        </div>
      </Suspense>
    </Container>
  );
}
