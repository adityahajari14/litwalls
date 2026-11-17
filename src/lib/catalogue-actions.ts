"use server";

import {
  buildProductQuery,
  priceBandsFor,
  sortOption,
} from "@/lib/catalogue";
import {
  getCatalogueFacets,
  getCataloguePage,
  type ProductPage,
} from "@/lib/shopify/products";
import { getCollectionListing } from "@/lib/collection-catalogue";

/**
 * Fetches the next page of a catalogue grid for the "Load more" button.
 *
 * A server action rather than a route handler so the Shopify token, the query
 * grammar and the sort mapping all stay on the server — the client sends a
 * cursor and the filters that are already visible in its own URL, nothing more.
 */
export async function loadMoreProducts({
  after,
  sort,
  size,
  price,
  pageSize,
}: {
  after: string;
  sort?: string;
  size?: string;
  price?: string;
  pageSize: number;
}): Promise<ProductPage> {
  const option = sortOption(sort);

  // Rebuilt from live facets rather than trusted from the client, so the
  // second page is filtered exactly as the first was.
  const facets = await getCatalogueFacets();
  const bands = priceBandsFor(facets.priceMin, facets.priceMax);

  return getCataloguePage({
    first: pageSize,
    after,
    query: buildProductQuery({ size, price, sizes: facets.sizes, bands }),
    ...option.product,
  });
}

/** The same, for a collection's grid. */
export async function loadMoreCollectionProducts({
  handle,
  after,
  sort,
  subject,
  format,
  pageSize,
}: {
  handle: string;
  after: string;
  sort?: string;
  subject?: string;
  format?: string;
  pageSize: number;
}): Promise<ProductPage> {
  const result = await getCollectionListing(handle, { after, sort, subject, format, pageSize });

  if (!result) return { products: [], hasNextPage: false, endCursor: null };

  return {
    products: result.products,
    hasNextPage: result.hasNextPage,
    endCursor: result.endCursor,
  };
}
