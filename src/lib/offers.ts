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

import { isCustomSinglePoster } from "@/lib/custom-products";
import { ENTRY_PRICE } from "@/lib/pricing";
import { isCustomProduct, isSplitProduct } from "@/lib/product";
import type { Cart } from "@/lib/shopify/types";

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

/**
 * Buy-X-get-Y on single posters — catalogue and custom alike.
 *
 * Codes are named BUY{pay}GET{free}FREE — not BUY{pay}FOR{total}, which was
 * the original naming and reads backwards. "LIT4FOR7" sounds like paying for
 * 7 to get 4, the opposite of the deal; a code should be legible on its own,
 * before anyone reads what it does.
 */
export const SINGLE_BUNDLES: Bundle[] = [
  { pay: 4, total: 7, code: "BUY4GET3FREE" },
  { pay: 5, total: 10, code: "BUY5GET5FREE" },
  { pay: 6, total: 18, code: "BUY6GET12FREE" },
  { pay: 10, total: 36, code: "BUY10GET26FREE" },
];

/**
 * Buy-X-get-Y on split-in-3 sets. A "set" is one 3-panel split poster, sold
 * and priced as a single unit — this ladder counts sets, not panels.
 */
export const SPLIT_BUNDLES: Bundle[] = [
  { pay: 1, total: 3, code: "SPLITBUY1GET2FREE" },
  { pay: 2, total: 8, code: "SPLITBUY2GET6FREE" },
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
 * Its own milestone, not tied to the free-shipping threshold — the two used
 * to share a number by coincidence (both were 349), which read as one offer
 * with two names instead of two separate reasons to spend more. ₹799 is
 * comfortably past a typical single-poster order, so reaching it means the
 * customer built a real basket rather than adding one extra ₹79 print to
 * trip a threshold that happened to be nearby.
 *
 * A milestone on the ORDER, not on being a first order: anyone's basket
 * qualifies, not just someone who has never bought before. See
 * customerSubtotal in cart.ts for what counts toward it.
 */
export const GIFT_THRESHOLD = 799;

/** One line describing the gift as a whole, for copy that doesn't need to
 *  single out either option. */
export const GIFT_DESCRIPTION = "5 mini pocket prints or retro prints";

/**
 * The free gift, and the two Shopify behaviours that shape how it works.
 *
 * 1. **Shopify never adds the free item itself.** A buy-X-get-Y discount whose
 *    "get" product is absent from the cart is simply inapplicable. So the
 *    storefront adds the line (see syncCartGift) and the Shopify discount
 *    makes it cost nothing. Both halves are required.
 *
 * 2. **Only one buy-X-get-Y discount applies per order.** Verified on the live
 *    store 2026-08-20 across every combination: two BXGY discounts never both
 *    apply, whether both are codes, or one is an automatic discount, and
 *    regardless of what `combinesWith` says. With LIT4FOR7 on the cart the
 *    gift stayed at full price; with no bundle code it dropped to ₹0.
 *
 * Consequence: the gift is set up in Shopify as an AUTOMATIC discount (no code
 * to type) and it applies to orders that are not already taking a bundle. A
 * customer buying 7 posters gets the bundle, which is worth far more than the
 * gift — so this is the right way round, but it must be said honestly on the
 * site rather than implying the two stack.
 */
/**
 * The bundle Shopify has actually applied to this cart, if any.
 *
 * Read off `discountCodes[].applicable` — Shopify's verdict — not off how many
 * posters are in the basket. The gift used to be withheld whenever a cart had
 * merely *reached a rung's "buy" count*, so six posters (no bundle yet, that
 * needs seven) lost the gift for a discount they were not getting. Only a
 * bundle that is really being taken blocks the gift.
 */
export function appliedBundle(cart: Cart): Bundle | null {
  for (const discount of cart.discountCodes) {
    if (!discount.applicable) continue;
    const bundle = ALL_BUNDLES.find((entry) => entry.code === discount.code);
    if (bundle) return bundle;
  }
  return null;
}

export type GiftOption = {
  /** Stable key stored in the preference cookie — never shown to the customer. */
  id: string;
  label: string;
  /** Must exist in Shopify and be in stock. */
  handle: string;
};

/**
 * The two products a customer can choose between as their free gift. Both are
 * real, published Shopify products — `defaultVariant` (shopify/types.ts) picks
 * the cheapest variant of whichever one is chosen, which is the "5" both
 * descriptions promise (the Set of 5 tier on each).
 */
export const GIFT_OPTIONS: GiftOption[] = [
  { id: "mini", label: "Mini pocket prints", handle: "mini-pocket-prints-pack-of-5" },
  { id: "retro", label: "Retro prints", handle: "retro-prints" },
];

export const DEFAULT_GIFT_OPTION = GIFT_OPTIONS[0].id;

/**
 * Where the customer's pick is remembered. Not httpOnly: it's a display
 * preference, not a credential, and the cart drawer reads it straight off
 * `document.cookie` to highlight the current choice without a round trip —
 * `syncCartGift` (shopify/cart.ts) is the only place that treats it as
 * authoritative.
 */
export const GIFT_CHOICE_COOKIE = "litwalls_gift_choice";

/** Marks the line as ours, so the cart can withdraw it if the basket shrinks. */
export const GIFT_ATTRIBUTE = "_gift";

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
const ALL_BUNDLES: Bundle[] = [...SINGLE_BUNDLES, ...SPLIT_BUNDLES];

export const MANAGED_DISCOUNT_CODES: string[] = ALL_BUNDLES.map(
  (bundle) => bundle.code,
);

/**
 * How many units a cart holds on each ladder.
 *
 * One function for both sides of the wire: the server uses it to decide which
 * codes to put on the cart, the drawer uses it to word the nudge. They used to
 * count separately — the server by asking Shopify which handles were tagged
 * `split`, the drawer by reading tags off the line — and disagreed about the
 * same basket.
 *
 * A custom poster is a single poster like any other and counts on the single
 * ladder; the custom split poster counts on the split one.
 *
 * Not counted on either ladder:
 *   - the gift line, so a gift the cart handed out can never be what tips
 *     someone onto a rung;
 *   - mini and retro prints, which are packs of small prints rather than
 *     posters and are not covered by the bundle discounts in Shopify.
 */
export function bundleQuantities(cart: Cart): {
  singleQuantity: number;
  splitQuantity: number;
} {
  let singleQuantity = 0;
  let splitQuantity = 0;

  for (const line of cart.lines.nodes) {
    if (line.attributes.some((attribute) => attribute.key === GIFT_ATTRIBUTE)) {
      continue;
    }

    const { product } = line.merchandise;
    if (isSplitProduct(product)) {
      splitQuantity += line.quantity;
    } else if (!isCustomProduct(product) || isCustomSinglePoster(product.handle)) {
      singleQuantity += line.quantity;
    }
  }

  return { singleQuantity, splitQuantity };
}

/**
 * The rungs a quantity can actually claim, most generous first.
 *
 * A rung is claimable once the cart holds its full `total` — the paid posters
 * AND the free ones. That is how Shopify evaluates a buy-X-get-Y, verified on
 * the live store: seven posters with BUY4GET3FREE gives three free, but five
 * or six with the same code gives nothing, and seven with BUY6GET12FREE gives
 * nothing either (it wants eighteen).
 *
 * The earlier version compared against `pay`, so seven posters were handed
 * the buy-6 code — which Shopify rejected, leaving the cart at full price.
 * Since every rung's `pay` is below the next rung's `total`, that mistake
 * meant no bundle ever applied below 36 posters.
 */
export function claimableBundles(bundles: Bundle[], quantity: number): Bundle[] {
  return bundles
    .filter((bundle) => quantity >= bundle.total)
    .sort((a, b) => bundleFreeCount(b) - bundleFreeCount(a));
}

/** The best rung a quantity can claim, or null below the first one. */
export function bundleForQuantity(
  bundles: Bundle[],
  quantity: number,
): Bundle | null {
  return claimableBundles(bundles, quantity)[0] ?? null;
}

/**
 * Every discount code a cart currently earns.
 *
 * Deliberately returns codes rather than amounts: Shopify decides what a code
 * is worth and whether it applies at all. This only nominates candidates — see
 * syncCartDiscounts, which applies them and then trusts Shopify's verdict.
 *
 * All claimable rungs are nominated, not just the top one. Shopify applies a
 * single buy-X-get-Y per order and picks the best that fits, so a cart of ten
 * where two posters fall outside the discount's collections still lands on
 * buy-4 instead of being offered buy-5 alone and getting nothing.
 */
export function earnedDiscountCodes({
  singleQuantity,
  splitQuantity,
}: {
  singleQuantity: number;
  splitQuantity: number;
}): string[] {
  return [
    ...claimableBundles(SINGLE_BUNDLES, singleQuantity),
    ...claimableBundles(SPLIT_BUNDLES, splitQuantity),
  ].map((bundle) => bundle.code);
}

/**
 * The next rung up from where a quantity currently sits, if there is one.
 *
 * Powers the "add 3 more and get 3 free" nudge. Measured against `total` for
 * the same reason as claimableBundles: the customer has to put the free
 * posters in the cart themselves, so the distance that matters is to the full
 * set. Returns null on the top rung, so the cart stops pushing once there is
 * nothing left to earn.
 */
export function nextBundle(
  bundles: Bundle[],
  quantity: number,
): Bundle | null {
  return (
    [...bundles]
      .sort((a, b) => a.total - b.total)
      .find((bundle) => quantity < bundle.total) ?? null
  );
}
