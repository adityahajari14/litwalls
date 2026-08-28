"use client";

import { useEffect } from "react";

import { trackGaSearch, trackGaViewItemList } from "@/lib/analytics/google-analytics";
import { trackMetaSearch } from "@/lib/analytics/meta-pixel";
import { trackSearchView } from "@/lib/analytics/shopify";
import type { Product } from "@/lib/shopify/types";

/**
 * Fires the search event into all three trackers (Shopify SEARCH_VIEW, Meta
 * Search, GA4 search + view_item_list for the results) from the search page,
 * which is a server component and so cannot reach window itself. Renders
 * nothing.
 *
 * Only mounted when there's a term to report — an empty /search visit with no
 * query is a page view, not a search, and PAGE_VIEW already covers it.
 */
export function SearchViewTracker({
  term,
  products,
}: {
  term: string;
  products: Product[];
}) {
  useEffect(() => {
    trackSearchView(term, products);
    trackMetaSearch(term);
    trackGaSearch(term);
    trackGaViewItemList(products, `Search: ${term}`);
    // Only the term should re-fire this, not every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  return null;
}
