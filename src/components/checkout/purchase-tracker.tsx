"use client";

import { useEffect } from "react";

import { trackGaPurchase } from "@/lib/analytics/google-analytics";
import { trackMetaPurchase } from "@/lib/analytics/meta-pixel";
import type { PurchaseSummary } from "@/lib/analytics/purchase";

/**
 * Reports a Fastrr order to Meta and GA4, once.
 *
 * The confirmation page can be reloaded, bookmarked and reopened, and each of
 * those would otherwise count the same order again — inflating revenue in the
 * very reports used to decide ad spend. A per-order marker in localStorage
 * stops it for this browser; `eventID` / `transaction_id` let the platforms
 * catch whatever gets past that.
 */
export function PurchaseTracker({ purchase }: { purchase: PurchaseSummary }) {
  useEffect(() => {
    const key = `litwalls:purchase:${purchase.orderId}`;

    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // Private mode: no marker to check, so report and lean on the
      // platforms' own dedupe.
    }

    trackMetaPurchase(purchase);
    trackGaPurchase(purchase);
  }, [purchase]);

  return null;
}
