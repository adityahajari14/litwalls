"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { META_PIXEL_ID, isMetaPixelConfigured } from "@/lib/analytics/meta-config";
import { trackMetaPageView } from "@/lib/analytics/meta-pixel";

/**
 * Meta Pixel base install — renders nothing itself beyond the script and its
 * <noscript> fallback.
 *
 * Deliberately unconditional: unlike ShopifyAnalytics, this does not check
 * HAS_USER_CONSENT. If that needs to change, gate the whole component here
 * (return null before rendering Script) rather than inside meta-pixel.ts,
 * so there is exactly one place that decides whether Meta ever loads at all.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTracked = useRef<string | null>(null);

  const search = searchParams.toString();

  useEffect(() => {
    if (!isMetaPixelConfigured() || !pathname) return;

    // The base script's own inline call already fires PageView for the very
    // first load; this effect only needs to cover navigations after that. The
    // guard mirrors ShopifyAnalytics — a re-render at the same URL is not a
    // new page view.
    const url = search ? `${pathname}?${search}` : pathname;
    if (lastTracked.current === null) {
      lastTracked.current = url;
      return;
    }
    if (lastTracked.current === url) return;
    lastTracked.current = url;

    trackMetaPageView();
  }, [pathname, search]);

  if (!isMetaPixelConfigured()) return null;

  return (
    <>
      <Script id="meta-pixel-base" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>

      {/* Fallback for the ~0% of traffic with JS disabled; Meta's own base
          code ships this alongside the script, not as a substitute for it. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
