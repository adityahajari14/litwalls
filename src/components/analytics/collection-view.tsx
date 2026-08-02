"use client";

import { useEffect } from "react";

import { trackCollectionView } from "@/lib/analytics/shopify";
import type { Collection, Product } from "@/lib/shopify/types";

/**
 * Fires COLLECTION_VIEW from the collection page, which is a server component
 * and so cannot reach window itself. Renders nothing.
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
    // Only the collection identity should re-fire this — a re-render from an
    // unrelated state change (e.g. cart opening) must not double-count the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection.id]);

  return null;
}
