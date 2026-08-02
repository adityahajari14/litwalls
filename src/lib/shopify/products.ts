import "server-only";

import { storefront } from "@/lib/shopify/client";
import {
  GET_COLLECTION_PRODUCTS,
  GET_COLLECTIONS,
  GET_PRODUCT_BY_HANDLE,
  GET_PRODUCT_HANDLES,
  GET_PRODUCTS,
  GET_VARIANT_INVENTORY,
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
