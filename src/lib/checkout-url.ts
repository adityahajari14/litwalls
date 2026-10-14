import { SUBSCRIBE_DISCOUNT_CODE } from "@/lib/marketing";

const CLAIMED_CODE_KEY = "litwalls:claimed-code";

/**
 * Remember that this visitor earned the newsletter code, so we can apply it
 * for them at checkout instead of asking them to remember and retype it.
 *
 * A discount the customer has to go and find is a discount a good share of
 * them never redeem — and every one of those is someone who saw a price, was
 * promised less, and paid more.
 */
export function rememberClaimedDiscount(code = SUBSCRIBE_DISCOUNT_CODE) {
  try {
    localStorage.setItem(CLAIMED_CODE_KEY, code);
  } catch {
    // Private mode. They still have the code on screen to enter by hand.
  }
}

/**
 * The code this visitor earned, if any. Exported for the Fastrr path, which
 * has no checkout URL to hang a `discount` param on and so puts the code on
 * the cart instead — see createFastrrCheckout.
 */
export function claimedDiscount() {
  try {
    return localStorage.getItem(CLAIMED_CODE_KEY);
  } catch {
    return null;
  }
}

/**
 * Shopify's checkout applies a `discount` query param automatically, so the
 * code lands on the order without a cart mutation. Shopify still validates it:
 * an expired or non-applicable code is simply ignored at checkout, so this can
 * never fabricate a discount the store isn't actually offering.
 */
export function withClaimedDiscount(checkoutUrl: string) {
  const code = claimedDiscount();
  if (!code) return checkoutUrl;

  try {
    const url = new URL(checkoutUrl);
    url.searchParams.set("discount", code);
    return url.toString();
  } catch {
    return checkoutUrl;
  }
}
