/**
 * Live offers. Every offer here is a promise the business has to honour at
 * its own cost, so each carries the discount code that must exist in Shopify
 * Admin. An offer advertised on the home page with no matching Shopify
 * discount is worse than no offer: the customer reaches checkout, the code
 * fails, and the order is abandoned at the last step.
 *
 * Two separate bundle ladders, because they apply to different products:
 * SINGLE_BUNDLES discounts single posters, SPLIT_BUNDLES discounts
 * split-in-3 sets. A split "set" is one 3-panel poster, priced and sold as
 * one unit — "buy 2, get 8" means 8 sets (24 panels total), not 8 panels.
 */

import { ENTRY_PRICE } from "@/lib/pricing";

export type Offer = {
  id: string;
  /** The headline, as the customer reads it. Short enough for a badge. */
  headline: string;
  /** What it actually means, in one sentence. No asterisks, no fine print. */
  detail: string;
  /**
   * The Shopify discount code, if the offer needs one. Null when Shopify
   * applies it automatically (an automatic discount or a shipping rate).
   */
  code: string | null;
  /** Shown on the offers strip. Keep the set small — see OFFERS ordering. */
  featured: boolean;
};

/** Must match the "Free shipping" rate's minimum in Settings → Shipping. */
export const FREE_SHIPPING_THRESHOLD = 349;

/** Flat rate below the threshold. Must match Shopify's shipping profile. */
export const FLAT_SHIPPING_FEE = 49;

/** First-order flat discount. Must match a real Shopify code. */
export const FIRST_ORDER_DISCOUNT = 100;
export const FIRST_ORDER_MINIMUM = 499;
export const FIRST_ORDER_CODE = "LIT100";

export type Bundle = {
  pay: number;
  total: number;
  code: string;
};

/** Buy-X-get-Y on single posters only. */
export const SINGLE_BUNDLES: Bundle[] = [
  { pay: 4, total: 7, code: "LIT4FOR7" },
  { pay: 5, total: 10, code: "LIT5FOR10" },
  { pay: 6, total: 18, code: "LIT6FOR18" },
  { pay: 10, total: 36, code: "LIT10FOR36" },
];

/**
 * Buy-X-get-Y on split-in-3 sets. A "set" is one 3-panel split poster, sold
 * and priced as a single unit — this ladder counts sets, not panels.
 */
export const SPLIT_BUNDLES: Bundle[] = [
  { pay: 1, total: 3, code: "LITSPLIT1FOR3" },
  { pay: 2, total: 8, code: "LITSPLIT2FOR8" },
];

/** Backward-compatible alias — existing components read BUNDLES for the
 *  single-poster ladder. */
export const BUNDLES = SINGLE_BUNDLES;

/** What a bundle works out to per unit, at a given unit price. */
export function bundleUnitPrice(bundle: Bundle, unitPrice: number): number {
  return (bundle.pay * unitPrice) / bundle.total;
}

/** How much a bundle saves off the undiscounted price, as a percentage. */
export function bundleSavingPercent(bundle: Bundle): number {
  return Math.round((1 - bundle.pay / bundle.total) * 100);
}

export const OFFERS: Offer[] = [
  {
    id: "first-order",
    headline: `₹${FIRST_ORDER_DISCOUNT} off your first order`,
    detail: `Use code ${FIRST_ORDER_CODE} at checkout on orders over ₹${FIRST_ORDER_MINIMUM}.`,
    code: FIRST_ORDER_CODE,
    featured: true,
  },
  {
    id: "bundle",
    headline: "Buy 4, get 7",
    detail: "Mix any posters. The more you buy, the better it gets — up to buy 10, get 36.",
    code: SINGLE_BUNDLES[0].code,
    featured: true,
  },
  {
    id: "split-bundle",
    headline: "Buy 1 split set, get 3",
    detail: "Buy 2 split-in-3 sets and get 8 — mix any designs.",
    code: SPLIT_BUNDLES[0].code,
    featured: true,
  },
  {
    id: "shipping",
    headline: `Free delivery over ₹${FREE_SHIPPING_THRESHOLD}`,
    detail: `Flat ₹${FLAT_SHIPPING_FEE} below that, anywhere in India. No surprise charges at checkout.`,
    code: null,
    featured: true,
  },
  {
    id: "replacement",
    headline: "Free replacement on damage",
    detail:
      "If a print arrives damaged or blurred, send us a short video and we ship a new one free. You keep the original.",
    code: null,
    featured: true,
  },
];

/**
 * The gift-with-purchase.
 *
 * Kept as a separate concept from OFFERS because it is the one lever here that
 * costs almost nothing and does real work: a pack of 5 mini prints is cheap to
 * produce, it puts the custom-print products in the customer's hands, and the
 * customer who has held one is the one who orders a ₹149 pack next time. That
 * makes it an acquisition cost, not a discount.
 *
 * Gated behind the free-shipping threshold so it lifts basket size instead of
 * being given away on a single ₹79 poster.
 */
export const GIFT_THRESHOLD = FREE_SHIPPING_THRESHOLD;
export const GIFT_DESCRIPTION = "5 free mini pocket prints on your first order";

/** The cheapest thing on the site, for "from ₹X" copy. Re-exported so that
 *  offer components need only one import. */
export { ENTRY_PRICE };
