/**
 * Live offers, and the record of which proposed offers were rejected.
 *
 * Every offer here is a promise the business has to honour at its own cost, so
 * each carries the discount code that must exist in Shopify Admin. An offer
 * advertised on the home page with no matching Shopify discount is worse than
 * no offer: the customer reaches checkout, the code fails, and the order is
 * abandoned at the last step.
 *
 * ── Why the aggressive tiers are not here ──────────────────────────────────
 * The proposed ladder was buy-4-get-3, buy-5-get-5, buy-6-get-12 and
 * buy-10-get-26. Priced against the A4 poster at ₹99 those work out to 43%,
 * 50%, 67% and 72% off respectively. The last two sell a poster for ₹33 and
 * ₹27.50 — at or below what 300gsm stock, ink, a rigid tube and courier cost
 * to deliver, before counting the ₹100 first-order discount that stacks on top
 * and the free shipping the order size guarantees. They do not convert better
 * than a 2-for-3 either: past roughly "buy 4", the offer stops recruiting new
 * buyers and starts discounting people who were going to buy anyway, while
 * signalling that the everyday price is fiction.
 *
 * The two tiers kept below are the ones that still clear a margin at a
 * realistic cost per print, and they ladder — 4 and 6 are close enough that
 * someone holding 3 in the cart can see the next step is worth taking.
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

/**
 * The bundle ladder. `pay` items are charged, `total` arrive.
 *
 * Kept to two rungs deliberately: a ladder a customer can hold in their head
 * converts better than a four-rung table they have to study, and the deeper
 * rungs lost money (see the note at the top of this file).
 */
export type Bundle = {
  pay: number;
  total: number;
  code: string;
};

export const BUNDLES: Bundle[] = [
  { pay: 4, total: 7, code: "LIT4FOR7" },
  { pay: 6, total: 10, code: "LIT6FOR10" },
];

/** What a bundle works out to per poster, at a given unit price. */
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
    detail: `Mix any posters. Buy 6 and get 10 — that's ${bundleSavingPercent(BUNDLES[1])}% off.`,
    code: BUNDLES[0].code,
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
