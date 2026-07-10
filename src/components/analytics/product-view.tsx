"use client";

import { useEffect } from "react";

import { trackProductView } from "@/lib/analytics/shopify";
import type { Product, ProductVariant } from "@/lib/shopify/types";

/**
 * Fires PRODUCT_VIEW from the product page, which is a server component and
 * so cannot reach window itself. Renders nothing.
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
  }, [product, variant]);

  return null;
}
