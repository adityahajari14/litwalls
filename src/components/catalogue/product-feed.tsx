"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import {
  loadMoreCollectionProducts,
  loadMoreProducts,
} from "@/lib/catalogue-actions";
import type { Product } from "@/lib/shopify/types";

/**
 * The catalogue grid, with the rest of the catalogue actually reachable.
 *
 * Every grid on this site previously took the first 48 products and stopped,
 * so a store with more than 48 posters had inventory that could not be browsed
 * to at all. This renders the server's first page and appends subsequent ones
 * through a server action.
 *
 * Appending rather than replacing is deliberate: a shopper who has scrolled
 * through forty posters and taps "Load more" has spent real attention getting
 * there, and paginating them to a fresh page would throw it away.
 *
 * The server still renders page one, so the grid is complete and indexable
 * without JavaScript — "Load more" is the enhancement, not the mechanism.
 *
 * A sort or filter change makes everything appended under the old filters
 * wrong. Rather than reset four pieces of state from an effect — which costs a
 * second render pass and is the cascading-render pattern React warns about —
 * the page gives this component a `key` derived from the active filters, so
 * React discards the whole instance and mounts a clean one.
 */
export function ProductFeed({
  initialProducts,
  initialCursor,
  initialHasNextPage,
  pageSize,
  /** Present when this feed belongs to a collection rather than /products. */
  collectionHandle,
}: {
  initialProducts: Product[];
  initialCursor: string | null;
  initialHasNextPage: boolean;
  pageSize: number;
  collectionHandle?: string;
}) {
  const params = useSearchParams();
  const [extra, setExtra] = useState<Product[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasNext, setHasNext] = useState(initialHasNextPage);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const products = [...initialProducts, ...extra];

  function loadMore() {
    if (!cursor || pending) return;
    setFailed(false);

    startTransition(async () => {
      try {
        const sort = params.get("sort") ?? undefined;
        const price = params.get("price") ?? undefined;

        const page = collectionHandle
          ? await loadMoreCollectionProducts({
              handle: collectionHandle,
              after: cursor,
              sort,
              price,
              pageSize,
            })
          : await loadMoreProducts({
              after: cursor,
              sort,
              size: params.get("size") ?? undefined,
              price,
              pageSize,
            });

        setExtra((current) => [...current, ...page.products]);
        setCursor(page.endCursor);
        setHasNext(page.hasNextPage);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <>
      <ul className="reveal-stagger grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
        {products.map((product, index) => (
          <li key={product.id} className="h-full">
            <ProductCard product={product} eager={index < 4} />
          </li>
        ))}
      </ul>

      {hasNext ? (
        <div className="mt-12 flex flex-col items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={loadMore}
            disabled={pending}
            className="min-w-56"
          >
            {pending ? "Loading…" : "Load more posters"}
          </Button>
          {failed ? (
            <p role="alert" className="text-sm text-brand-700">
              That didn&apos;t load. Check your connection and try again.
            </p>
          ) : (
            <p className="text-sm text-ink-500">
              Showing {products.length} so far
            </p>
          )}
        </div>
      ) : null}
    </>
  );
}
