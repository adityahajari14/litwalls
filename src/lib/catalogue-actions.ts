"use server";

import {
  buildProductQuery,
  priceBand,
  priceBandsFor,
  sortOption,
} from "@/lib/catalogue";
import {
  getCatalogueFacets,
  getCataloguePage,
  getCollectionProducts,
  type ProductPage,
} from "@/lib/shopify/products";

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
  price,
  pageSize,
}: {
  handle: string;
  after: string;
  sort?: string;
  price?: string;
  pageSize: number;
}): Promise<ProductPage> {
  const option = sortOption(sort);

  const result = await getCollectionProducts(handle, {
    first: pageSize,
    after,
    ...option.collection,
  });

  if (!result) return { products: [], hasNextPage: false, endCursor: null };

  // Shopify's collection query has no price filter in its sort grammar, so a
  // price band is applied here rather than silently ignored. This filters the
  // page that was fetched, which is why the collection page tells the shopper
  // how many of the loaded prints matched rather than claiming a total.
  //
  // The bands are recomputed from the live catalogue — the same source the
  // toolbar rendered them from — instead of the hardcoded table that used to
  // sit here and could drift out of step with it.
  const facets = await getCatalogueFacets();
  const band = priceBand(price, priceBandsFor(facets.priceMin, facets.priceMax));

  const products = band
    ? result.products.filter((product) => {
        const amount = Number(product.priceRange.minVariantPrice.amount);
        return amount >= band.min && (band.max === null || amount <= band.max);
      })
    : result.products;

  return {
    products,
    hasNextPage: result.hasNextPage,
    endCursor: result.endCursor,
  };
}
