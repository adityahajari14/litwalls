"use client";

import Script from "next/script";

import {
  FASTRR_ASSETS,
  FASTRR_SELLER_DOMAIN,
  isFastrrConfigured,
} from "@/lib/checkout/fastrr-config";

/**
 * Loads Shiprocket Fastrr's checkout overlay.
 *
 * Renders nothing at all when `NEXT_PUBLIC_FASTRR_SELLER_DOMAIN` is unset, so
 * an unconfigured environment carries none of this weight and every checkout
 * button keeps going to Shopify.
 *
 * The hidden `#sellerDomain` input is not decorative: their script reads it by
 * id, in several places, to work out whose configuration to load. Without it
 * the overlay falls back to `window.location.host`, which is only correct by
 * coincidence.
 *
 * The file is still called `shopify.js` on a non-Shopify integration: it is
 * one script for every channel, and `HeadlessCheckout.addToCart` is the entry
 * point for a custom site like this one.
 *
 * `afterInteractive`, not `lazyOnload`. Nothing here is needed until someone
 * reaches a checkout button, which argues for loading it as late as possible —
 * but `lazyOnload` waits for the window load event, and on an image-heavy
 * catalogue page that can land after the shopper has already tapped "Buy now".
 * `startCheckout` handles that gracefully by using Shopify instead, except
 * that quietly forfeits the COD and UPI this integration exists to add. A
 * ~78KB script that is ready when the button is pressed is the better trade.
 */
export function FastrrScript() {
  if (!isFastrrConfigured()) return null;

  return (
    <>
      <input type="hidden" id="sellerDomain" value={FASTRR_SELLER_DOMAIN} readOnly />
      <link rel="stylesheet" href={FASTRR_ASSETS.styles} />
      <Script src={FASTRR_ASSETS.script} strategy="afterInteractive" />
    </>
  );
}
