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

/**
 * How many come free in a bundle — "buy 4, get 3 free" rather than "buy 4,
 * get 7". The first phrasing states the deal in terms of what changes for the
 * customer (their cost stays the same, more shows up); the second makes them
 * do the subtraction themselves to see the offer at all. One helper here so
 * every consumer phrases it the same way.
 */
export function bundleFreeCount(bundle: Bundle): number {
  return bundle.total - bundle.pay;
}

/**
 * The gift-with-purchase.
 *
 * Kept as a separate concept from the bundle ladders because it is the one
 * lever here that costs almost nothing and does real work: a pack of 5 mini
 * prints is cheap to
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

/**
 * Every code the cart applies on the customer's behalf.
 *
 * The auto-apply logic adds and removes exactly these, and leaves anything
 * else on the cart alone — a code the customer typed themselves is theirs, not
 * ours to drop when their basket size changes.
 */
export const MANAGED_DISCOUNT_CODES: string[] = [
  ...SINGLE_BUNDLES.map((bundle) => bundle.code),
  ...SPLIT_BUNDLES.map((bundle) => bundle.code),
];

/**
 * Which rung of a ladder a given quantity has reached.
 *
 * The best rung whose `pay` threshold the quantity meets — so 7 posters earns
 * the buy-4 rung, and 12 earns buy-10. Returns null below the first rung.
 *
 * Ladders are searched from the top so the customer always gets the most
 * generous rung they qualify for, regardless of array order.
 */
export function bundleForQuantity(
  bundles: Bundle[],
  quantity: number,
): Bundle | null {
  return (
    [...bundles]
      .sort((a, b) => b.pay - a.pay)
      .find((bundle) => quantity >= bundle.pay) ?? null
  );
}

/**
 * Every discount code a cart currently earns.
 *
 * Deliberately returns codes rather than amounts: Shopify decides what a code
 * is worth and whether it applies at all. This only nominates candidates — see
 * syncCartDiscounts, which applies them and then trusts Shopify's verdict.
 */
export function earnedDiscountCodes({
  singleQuantity,
  splitQuantity,
}: {
  singleQuantity: number;
  splitQuantity: number;
}): string[] {
  const codes: string[] = [];

  const single = bundleForQuantity(SINGLE_BUNDLES, singleQuantity);
  if (single) codes.push(single.code);

  const split = bundleForQuantity(SPLIT_BUNDLES, splitQuantity);
  if (split) codes.push(split.code);

  return codes;
}

/**
 * The next rung up from where a quantity currently sits, if there is one.
 *
 * Powers the "add 1 more and get 3 free" nudge. Returns null when the customer
 * is already on the top rung, so the cart stops pushing once there is nothing
 * left to earn.
 */
export function nextBundle(
  bundles: Bundle[],
  quantity: number,
): Bundle | null {
  return (
    [...bundles]
      .sort((a, b) => a.pay - b.pay)
      .find((bundle) => quantity < bundle.pay) ?? null
  );
}
