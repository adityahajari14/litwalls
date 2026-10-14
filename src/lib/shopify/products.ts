import "server-only";

import { storefront } from "@/lib/shopify/client";
import {
  GET_COLLECTION_PRODUCTS,
  GET_COLLECTIONS,
  GET_PRODUCT_BY_HANDLE,
  GET_PRODUCT_HANDLES,
  GET_PRODUCTS,
  GET_VARIANT_INVENTORY,
  GET_VARIANTS_INVENTORY,
  PREDICTIVE_SEARCH,
} from "@/lib/shopify/queries";
import {
  CUSTOM_TAG,
  SPLIT_TAG,
  isCustomProduct,
  isSplitProduct,
} from "@/lib/product";
import {
  SIZE_OPTION,
  type Collection,
  type CollectionSummary,
  type Image,
  type Product,
} from "@/lib/shopify/types";

/** Catalogue data changes rarely; a short window keeps pages fast but fresh. */
const CATALOGUE_REVALIDATE = 60 * 10;

export type ProductSortKey =
  | "BEST_SELLING"
  | "CREATED_AT"
  | "PRICE"
  | "TITLE"
  | "RELEVANCE";

/** One page of products, plus the cursor needed to ask for the next one. */
export type ProductPage = {
  products: Product[];
  hasNextPage: boolean;
  endCursor: string | null;
};

export type ProductQuery = {
  first?: number;
  query?: string;
  sortKey?: ProductSortKey;
  /** `CREATED_AT` and `PRICE` both ascend by default. */
  reverse?: boolean;
  /** Cursor from a previous page's `endCursor`. */
  after?: string | null;
};

/**
 * A page of products with its cursor.
 *
 * The catalogue pages used to take the first 48 and stop, which quietly made
 * every product past the 48th unreachable from /products as the catalogue
 * grew. Anything that needs to page through the catalogue uses this;
 * `getProducts` stays as the convenience wrapper for the fixed-size shelves.
 */
export async function getProductPage({
  first = 24,
  query,
  sortKey,
  reverse,
  after,
}: ProductQuery = {}): Promise<ProductPage> {
  const data = await storefront<{
    products: {
      nodes: Product[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(GET_PRODUCTS, {
    variables: { first, query, sortKey, reverse, after: after ?? null },
    revalidate: CATALOGUE_REVALIDATE,
    tags: ["products"],
  });

  return {
    products: data.products.nodes,
    hasNextPage: data.products.pageInfo.hasNextPage,
    endCursor: data.products.pageInfo.endCursor,
  };
}

export async function getProducts(options: ProductQuery = {}): Promise<Product[]> {
  const { products } = await getProductPage(options);
  return products;
}

/**
 * A page of the browsable catalogue: everything except the customer-upload
 * products, which need an upload before they can be bought and so have their
 * own entry point.
 *
 * Filtered here rather than with `-tag:custom` in the query, because that
 * search is case-insensitive and also drops every ordinary poster that merely
 * has a descriptive "Custom" tag — see isCustomProduct. A page can therefore
 * come back a few cards short of `first`; the cursor still points at the right
 * place, so "Load more" is unaffected.
 */
export async function getCataloguePage(
  options: ProductQuery = {},
): Promise<ProductPage> {
  const page = await getProductPage(options);
  return {
    ...page,
    products: page.products.filter((product) => !isCustomProduct(product)),
  };
}

/**
 * What the catalogue can actually be filtered by.
 *
 * Derived from the live products rather than hardcoded, because a filter
 * control that cannot change the result is worse than no control: it invites a
 * tap and answers with the same grid, which reads as broken.
 *
 * On the store as it stands every standard product is a single variant at one
 * flat price with no size options at all, so both facets come back empty and
 * the toolbar renders sort only. The moment sizes and real price spread are
 * published in Shopify, the filters appear on their own.
 */
export async function getCatalogueFacets(): Promise<{
  sizes: string[];
  priceMin: number;
  priceMax: number;
}> {
  const products = await getStandardProducts({ first: 250 });

  const sizes = new Set<string>();
  let priceMin = Infinity;
  let priceMax = 0;

  for (const product of products) {
    for (const option of product.options) {
      if (option.name !== SIZE_OPTION) continue;
      for (const value of option.values) sizes.add(value);
    }
    for (const variant of product.variants.nodes) {
      const amount = Number(variant.price.amount);
      if (!Number.isFinite(amount)) continue;
      if (amount < priceMin) priceMin = amount;
      if (amount > priceMax) priceMax = amount;
    }
  }

  return {
    // Only worth offering when there is more than one to choose between.
    sizes: sizes.size > 1 ? [...sizes] : [],
    priceMin: Number.isFinite(priceMin) ? priceMin : 0,
    priceMax,
  };
}

/**
 * How many products the catalogue actually holds.
 *
 * `/products` previously printed `products.length` after slicing to 48, so it
 * announced "48 prints" whether the store had 48 or 400 — which reads as a very
 * small shop to anyone comparing. Counting handles is the cheapest way to ask:
 * the query returns one string per product rather than the full record.
 *
 * Shopify caps a single page at 250, so a larger catalogue reports `atLeast`.
 */
export async function getProductCount(): Promise<{
  count: number;
  atLeast: boolean;
}> {
  const handles = await getProductHandles();
  return { count: handles.length, atLeast: handles.length >= 250 };
}

/**
 * Turns a shopper's words into a query for Shopify's search syntax.
 *
 * The query goes into a filter language where `:`, quotes, parentheses and a
 * leading `-` are operators. Left raw, a search for `size:A3` or an unbalanced
 * quote is either silently reinterpreted as a field filter or rejected
 * outright — so everything but letters and digits is dropped, and the words
 * are lowercased so "AND" / "OR" / "NOT" can't act as operators either.
 *
 * The last word gets a `*`, making it a prefix match. This used to wrap the
 * whole term in quotes instead, which is an exact-phrase search: "ferr" found
 * nothing at all until the shopper had typed "ferrari" in full, and anyone
 * who stopped a letter short was told the store had no such poster.
 *
 * Returns null when nothing searchable is left.
 */
export function buildSearchQuery(term: string): string | null {
  const words = term
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  if (words.length === 0) return null;

  return words
    .map((word, index) => (index === words.length - 1 ? `${word}*` : word))
    .join(" ");
}

/**
 * Matches for a half-typed term, for the header's live search.
 *
 * Shopify's predictive search rather than the filter grammar above: it is
 * typo-tolerant as well as prefix-aware. Throws on an API error so the caller
 * can fall back to `searchProducts`.
 */
export async function suggestProducts(term: string, limit = 6): Promise<Product[]> {
  const trimmed = term.trim();
  if (!trimmed) return [];

  const data = await storefront<{
    predictiveSearch: { products: Product[] } | null;
  }>(PREDICTIVE_SEARCH, {
    // Shopify caps predictive results at 10 per type.
    variables: { query: trimmed, limit: Math.min(limit, 10) },
    revalidate: CATALOGUE_REVALIDATE,
    tags: ["products"],
  });

  return data.predictiveSearch?.products ?? [];
}

/**
 * Free-text product search for the `/search` page. Returns nothing for a
 * blank term rather than the whole catalogue.
 *
 * Falls back to the predictive search when the main query finds nothing, so a
 * misspelling that the live popup forgave ("ferari") doesn't then land on a
 * results page claiming there are no matches.
 */
export async function searchProducts(term: string, first = 48): Promise<Product[]> {
  const query = buildSearchQuery(term);
  if (!query) return [];

  const products = await getProducts({ first, query, sortKey: "RELEVANCE" });
  if (products.length > 0) return products;

  try {
    return await suggestProducts(term, 10);
  } catch {
    return [];
  }
}

export async function getProduct(handle: string): Promise<Product | null> {
  const data = await storefront<{ product: Product | null }>(
    GET_PRODUCT_BY_HANDLE,
    {
      variables: { handle },
      revalidate: CATALOGUE_REVALIDATE,
      tags: ["products", `product:${handle}`],
    },
  );

  return data.product;
}

export async function getProductHandles(first = 250): Promise<string[]> {
  const data = await storefront<{ products: { nodes: { handle: string }[] } }>(
    GET_PRODUCT_HANDLES,
    { variables: { first }, revalidate: CATALOGUE_REVALIDATE, tags: ["products"] },
  );

  return data.products.nodes.map((node) => node.handle);
}

/** Defined in the client-safe module; re-exported so server callers keep one import. */
export { CUSTOM_TAG, SPLIT_TAG } from "@/lib/product";

/** How many matches to pull before re-checking a tag search case-sensitively. */
const TAG_SEARCH_LIMIT = 50;

/** Room for the custom products a standard shelf fetches and then drops. */
const CUSTOM_HEADROOM = 8;

/**
 * Products the customer supplies the artwork for.
 *
 * Returns whatever Shopify actually has tagged. Callers render nothing when
 * this is empty rather than showing a section promising products that do not
 * exist yet.
 */
export async function getCustomProducts(first = 8): Promise<Product[]> {
  // Over-fetched and re-checked: the tag search is case-insensitive and also
  // returns posters with a descriptive "Custom" tag. See isCustomProduct.
  const products = await getProducts({
    first: TAG_SEARCH_LIMIT,
    query: `tag:${CUSTOM_TAG}`,
  });
  return products.filter(isCustomProduct).slice(0, first);
}

/**
 * Ready-made split-in-3 sets — not the custom split poster, which only
 * appears under "Design your own". Empty until such products are published.
 */
export async function getSplitProducts(first = 8): Promise<Product[]> {
  const products = await getProducts({
    first: TAG_SEARCH_LIMIT,
    query: `tag:${SPLIT_TAG}`,
  });
  return products
    .filter((product) => isSplitProduct(product) && !isCustomProduct(product))
    .slice(0, first);
}

/**
 * The catalogue minus the custom-print products.
 *
 * A caller's `query` is passed through untouched; the exclusion happens on
 * the results.
 */
export async function getStandardProducts({
  first = 24,
  ...options
}: {
  first?: number;
  query?: string;
  sortKey?: ProductSortKey;
  reverse?: boolean;
} = {}): Promise<Product[]> {
  // Asks for a few more than needed and drops the custom products afterwards,
  // rather than excluding them with `-tag:custom` — that search is
  // case-insensitive and would also remove every poster with a descriptive
  // "Custom" tag. The headroom covers the handful of real custom products, so
  // a shelf of four still comes back with four.
  const products = await getProducts({
    ...options,
    first: Math.min(first + CUSTOM_HEADROOM, 250),
  });
  return products.filter((product) => !isCustomProduct(product)).slice(0, first);
}

/**
 * Collections that exist in Shopify but must never show up in browse
 * navigation. `custom-prints` is the customer-upload range: it has its own
 * entry point (`/custom`, "Design your own") and its own on-page treatment, so
 * listing it in the header, footer or /collections index alongside Marvel, DC
 * and the rest would present it as just another poster collection.
 */
const HIDDEN_COLLECTION_HANDLES = new Set([
  "custom-prints",
  // Discount plumbing, not a range: it exists so the bundle codes can reach
  // the custom poster (see scripts/sync-discounts.mjs). It isn't published to
  // any sales channel, so this is only a second lock on the same door.
  "bundle-custom-posters",
]);

/**
 * Collections worth linking to.
 *
 * Two things are settled here so no caller has to think about them:
 *
 *   - **Empty collections are dropped.** Shopify returns a collection whether
 *     or not anything in it is published, so a range whose products were all
 *     archived kept its place in the header, the footer and the home page and
 *     led to "Nothing in this collection yet".
 *   - **A cover is filled in.** When no collection image is set in admin the
 *     first product's artwork stands in, so every tile on the site shows a
 *     poster rather than a placeholder.
 */
export async function getCollections(first = 12): Promise<CollectionSummary[]> {
  type Node = Collection & {
    previews: { nodes: { featuredImage: Image | null }[] };
    counted: { nodes: { id: string }[] };
  };

  const data = await storefront<{ collections: { nodes: Node[] } }>(
    GET_COLLECTIONS,
    { variables: { first }, revalidate: CATALOGUE_REVALIDATE, tags: ["collections"] },
  );

  return data.collections.nodes
    .filter((collection) => !HIDDEN_COLLECTION_HANDLES.has(collection.handle))
    .map(({ previews, counted, ...collection }) => {
      const images = previews.nodes
        .map((product) => product.featuredImage)
        .filter((image): image is Image => image !== null);

      return {
        ...collection,
        image: collection.image ?? images[0] ?? null,
        previews: images,
        productCount: counted.nodes.length,
      };
    })
    .filter((collection) => collection.productCount > 0);
}

/**
 * Sort keys Shopify accepts *within a collection*. Deliberately a different
 * union from ProductSortKey: a collection has a curated manual order
 * (`COLLECTION_DEFAULT`) that the global product list has no equivalent for,
 * and it does not accept `RELEVANCE`.
 */
export type CollectionSortKey =
  | "COLLECTION_DEFAULT"
  | "BEST_SELLING"
  | "CREATED"
  | "PRICE"
  | "TITLE";

export async function getCollectionProducts(
  handle: string,
  {
    first = 24,
    sortKey,
    reverse,
    after,
  }: {
    first?: number;
    sortKey?: CollectionSortKey;
    reverse?: boolean;
    after?: string | null;
  } = {},
): Promise<
  | ({ collection: Collection; products: Product[] } & {
      hasNextPage: boolean;
      endCursor: string | null;
    })
  | null
> {
  const data = await storefront<{
    collection:
      | (Collection & {
          products: {
            nodes: Product[];
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
          };
        })
      | null;
  }>(GET_COLLECTION_PRODUCTS, {
    variables: { handle, first, sortKey, reverse, after: after ?? null },
    revalidate: CATALOGUE_REVALIDATE,
    tags: ["products", `collection:${handle}`],
  });

  if (!data.collection) return null;

  const { products, ...collection } = data.collection;
  return {
    collection,
    products: products.nodes,
    hasNextPage: products.pageInfo.hasNextPage,
    endCursor: products.pageInfo.endCursor,
  };
}

/**
 * Stock level for the "Only N left" messaging. Requires the
 * `unauthenticated_read_product_inventory` scope; if the store's Storefront
 * token doesn't have it, this quietly returns null (unlimited/unknown stock)
 * rather than take down the page — see the comment on GET_VARIANT_INVENTORY.
 */
/**
 * Stock for every variant of a product, in one request.
 *
 * Used by the product page, where each size has its own stock level. Asking
 * per variant would multiply every page's requests by the number of sizes,
 * which during a full build is enough to get connections reset by Shopify.
 *
 * Degrades the same way as the single-variant version: a missing inventory
 * scope yields nulls and the "Only N left" messaging simply goes quiet.
 */
export async function getVariantQuantities(
  variantIds: string[],
): Promise<Record<string, number | null>> {
  const result: Record<string, number | null> = {};
  for (const id of variantIds) result[id] = null;

  if (variantIds.length === 0) return result;

  try {
    const data = await storefront<{
      nodes: ({ id: string; quantityAvailable: number | null } | null)[];
    }>(GET_VARIANTS_INVENTORY, {
      variables: { ids: variantIds },
      revalidate: 60,
      tags: ["inventory"],
    });

    for (const node of data.nodes) {
      if (node?.id) result[node.id] = node.quantityAvailable ?? null;
    }
  } catch {
    // Leave every entry null — unknown stock, not zero stock.
  }

  return result;
}

export async function getVariantQuantityAvailable(
  variantId: string,
): Promise<number | null> {
  try {
    const data = await storefront<{
      node: { quantityAvailable: number } | null;
    }>(GET_VARIANT_INVENTORY, {
      variables: { id: variantId },
      revalidate: 60,
      tags: ["inventory"],
    });

    return data.node?.quantityAvailable ?? null;
  } catch {
    return null;
  }
}
