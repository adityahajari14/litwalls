"use client";

import { useEffect } from "react";

import { trackGaViewItemList } from "@/lib/analytics/google-analytics";
import { trackMetaViewCategory } from "@/lib/analytics/meta-pixel";
import { trackCollectionView } from "@/lib/analytics/shopify";
import type { Collection, Product } from "@/lib/shopify/types";

/**
 * Fires the collection-view event into all three trackers (Shopify
 * COLLECTION_VIEW, Meta ViewCategory, GA4 view_item_list) from the collection
 * page, which is a server component and so cannot reach window itself. Renders
 * nothing.
 */
export function CollectionViewTracker({
  collection,
  products,
}: {
  collection: Collection;
  products: Product[];
}) {
  useEffect(() => {
    trackCollectionView(collection, products);
    trackMetaViewCategory(collection, products);
    trackGaViewItemList(products, collection.title);
    // Only the collection identity should re-fire this — a re-render from an
    // unrelated state change (e.g. cart opening) must not double-count the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection.id]);

  return null;
}
