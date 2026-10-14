import type { Metadata } from "next";
import Form from "next/form";

import { SearchViewTracker } from "@/components/analytics/search-view";
import { SearchIcon } from "@/components/icons";
import { ProductGrid } from "@/components/product-grid";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { searchProducts } from "@/lib/shopify/products";

export const metadata: Metadata = {
  title: "Search",
  description: "Search every Litwalls poster.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = q?.trim() ?? "";

  const products = await searchProducts(term, 48);

  return (
    <Container className="py-12 lg:py-16">
      {term ? <SearchViewTracker term={term} products={products} /> : null}

      <header className="max-w-2xl">
        <h1 className="font-display text-5xl text-ink-950 sm:text-6xl">
          Search
        </h1>

        <Form action="/search" className="mt-6">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              name="q"
              defaultValue={term}
              autoFocus
              placeholder="Search posters…"
              aria-label="Search posters"
              className="h-13 w-full rounded-full border border-ink-200 bg-white pl-12 pr-5 text-ink-900 transition-colors placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
            />
          </div>
        </Form>
      </header>

      {!term ? (
        <p className="mt-10 text-ink-600">
          Search by title, character, film, band — anything on the poster.
        </p>
      ) : products.length === 0 ? (
        <div className="mt-10">
          <p className="text-ink-900">
            Nothing matches{" "}
            <span className="font-medium">“{term}”</span>.
          </p>
          <p className="mt-1 text-ink-600 text-pretty">
            Try a broader word — or have us print exactly what you had in mind.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/products" variant="ghost">
              Browse all posters
            </ButtonLink>
            <ButtonLink href="/custom">Make a custom poster</ButtonLink>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-8 text-sm text-ink-600">
            {products.length} result{products.length === 1 ? "" : "s"} for{" "}
            <span className="font-medium text-ink-900">“{term}”</span>
          </p>

          <ProductGrid products={products} className="mt-8" />
        </>
      )}
    </Container>
  );
}
