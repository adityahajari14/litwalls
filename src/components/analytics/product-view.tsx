"use client";

import { useEffect } from "react";

import { trackGaViewItem } from "@/lib/analytics/google-analytics";
import { trackMetaViewContent } from "@/lib/analytics/meta-pixel";
import { trackProductView } from "@/lib/analytics/shopify";
import type { Product, ProductVariant } from "@/lib/shopify/types";

/**
 * Fires the product-view event into all three trackers (Shopify PRODUCT_VIEW,
 * Meta ViewContent, GA4 view_item) from the product page, which is a server
 * component and so cannot reach window itself. Renders nothing.
 */
export function ProductViewTracker({
  product,
  variant,
}: {
  product: Product;
  variant: ProductVariant | null;
}) {
  useEffect(() => {
    trackProductView(product, variant);
    trackMetaViewContent(product, variant);
    trackGaViewItem(product, variant);
  }, [product, variant]);

  return null;
}
