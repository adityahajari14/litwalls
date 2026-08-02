import type { Metadata } from "next";
import Form from "next/form";

import { SearchViewTracker } from "@/components/analytics/search-view";
import { SearchIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getProducts } from "@/lib/shopify/products";

export const metadata: Metadata = {
  title: "Search",
  description: "Search every Litwalls poster.",
};

/**
 * Escapes a user's words for Shopify's search syntax.
 *
 * The query goes into a filter language where `:`, quotes and parentheses are
 * operators. Left raw, a search for `size:A3` or an unbalanced quote is either
 * silently reinterpreted as a field filter or rejected outright — so we quote
 * the whole thing and escape what's inside, making it a literal text search.
 */
function escapeQuery(term: string) {
  return `"${term.replace(/["\\]/g, "\\$&")}"`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = q?.trim() ?? "";

  const products = term
    ? await getProducts({
        first: 48,
        query: escapeQuery(term),
        sortKey: "RELEVANCE",
      })
    : [];

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
              placeholder="Try “Interstellar”, “anime”, “F1”…"
              aria-label="Search posters"
              className="h-13 w-full rounded-full border border-ink-200 bg-white pl-12 pr-5 text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
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

          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {products.map((product, index) => (
              <li key={product.id}>
                <ProductCard product={product} priority={index < 4} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Container>
  );
}
