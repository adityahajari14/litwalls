import "server-only";

import { sortOption } from "@/lib/catalogue";
import { collectionProductPage, selectCollectionProducts, type CollectionFilterParams } from "@/lib/collection-filters";
import { getAllCollectionProducts } from "@/lib/shopify/products";

export async function getCollectionListing(handle: string, params: CollectionFilterParams & {
  sort?: string;
  after?: string;
  pageSize?: number;
} = {}) {
  const inventory = await getAllCollectionProducts(handle, sortOption(params.sort).collection);
  if (!inventory) return null;
  const selected = selectCollectionProducts(handle, inventory.products, params);
  const page = collectionProductPage(selected.products, params.after, params.pageSize ?? 24);
  return {
    ...selected, ...page, collection: inventory.collection,
    total: selected.products.length, allProducts: inventory.products,
  };
}
