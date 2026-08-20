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
} from "@/lib/shopify/queries";
import type { Collection, Product } from "@/lib/shopify/types";

/** Catalogue data changes rarely; a short window keeps pages fast but fresh. */
const CATALOGUE_REVALIDATE = 60 * 10;

export async function getProducts({
  first = 24,
  query,
  sortKey,
  reverse,
}: {
  first?: number;
  query?: string;
  sortKey?: "BEST_SELLING" | "CREATED_AT" | "PRICE" | "TITLE" | "RELEVANCE";
  /** `CREATED_AT` ascends by default, so newest-first needs this. */
  reverse?: boolean;
} = {}): Promise<Product[]> {
  const data = await storefront<{ products: { nodes: Product[] } }>(
    GET_PRODUCTS,
    {
      variables: { first, query, sortKey, reverse },
      revalidate: CATALOGUE_REVALIDATE,
      tags: ["products"],
    },
  );

  return data.products.nodes;
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

/**
 * The tag that marks a product as customer-uploaded artwork in Shopify.
 *
 * Custom products are ordinary Shopify products — real mockups, real variants,
 * real prices — that happen to be printed from a file the customer supplies.
 * The tag is the only thing separating them from the rest of the catalogue, so
 * it has to match exactly what is set in Shopify admin.
 */
export const CUSTOM_TAG = "custom";

/**
 * Products the customer supplies the artwork for.
 *
 * Returns whatever Shopify actually has tagged — one product today, more as
 * split posters, mini prints and polaroids are published. Callers render
 * nothing when this is empty rather than showing a section promising products
 * that do not exist yet.
 */
export async function getCustomProducts(first = 8): Promise<Product[]> {
  return getProducts({ first, query: `tag:${CUSTOM_TAG}` });
}

/** The catalogue minus the custom-print products. */
export async function getStandardProducts(options: {
  first?: number;
  sortKey?: "BEST_SELLING" | "CREATED_AT" | "PRICE" | "TITLE" | "RELEVANCE";
  reverse?: boolean;
} = {}): Promise<Product[]> {
  return getProducts({ ...options, query: `-tag:${CUSTOM_TAG}` });
}

export async function getCollections(first = 12): Promise<Collection[]> {
  const data = await storefront<{ collections: { nodes: Collection[] } }>(
    GET_COLLECTIONS,
    { variables: { first }, revalidate: CATALOGUE_REVALIDATE, tags: ["collections"] },
  );

  return data.collections.nodes;
}

export async function getCollectionProducts(
  handle: string,
  first = 24,
): Promise<{ collection: Collection; products: Product[] } | null> {
  const data = await storefront<{
    collection: (Collection & { products: { nodes: Product[] } }) | null;
  }>(GET_COLLECTION_PRODUCTS, {
    variables: { handle, first },
    revalidate: CATALOGUE_REVALIDATE,
    tags: ["products", `collection:${handle}`],
  });

  if (!data.collection) return null;

  const { products, ...collection } = data.collection;
  return { collection, products: products.nodes };
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
