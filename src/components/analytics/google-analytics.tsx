"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { primeGaLinker } from "@/lib/analytics/ga-linker";
import {
  GA_MEASUREMENT_ID,
  isGoogleAnalyticsConfigured,
} from "@/lib/analytics/google-config";
import { trackGaPageView } from "@/lib/analytics/google-analytics";

/**
 * Google Analytics 4 base install (gtag.js) — renders the loader script and
 * its inline bootstrap, nothing visible.
 *
 * Deliberately unconditional, like MetaPixel and unlike ShopifyAnalytics: it
 * does not check HAS_USER_CONSENT. To gate it, return null before rendering
 * Script here rather than inside google-analytics.ts, so there is exactly one
 * place that decides whether GA ever loads at all.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTracked = useRef<string | null>(null);

  const search = searchParams.toString();

  // Grab the GA client/session ids once gtag has loaded so the checkout links
  // can carry them across to Shopify's domain. See lib/analytics/ga-linker.ts.
  useEffect(() => {
    primeGaLinker();
  }, []);

  useEffect(() => {
    if (!isGoogleAnalyticsConfigured() || !pathname) return;

    // `gtag('config', ...)` in the bootstrap below already sends page_view for
    // the first load; this effect only needs to cover navigations after that.
    // The guard mirrors MetaPixel / ShopifyAnalytics — a re-render at the same
    // URL is not a new page view.
    const url = search ? `${pathname}?${search}` : pathname;
    if (lastTracked.current === null) {
      lastTracked.current = url;
      return;
    }
    if (lastTracked.current === url) return;
    lastTracked.current = url;

    trackGaPageView(url);
  }, [pathname, search]);

  if (!isGoogleAnalyticsConfigured()) return null;

  return (
    <>
      <Script
        id="ga-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-base" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
