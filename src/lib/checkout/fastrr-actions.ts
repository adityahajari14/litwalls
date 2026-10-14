"use server";

import { headers } from "next/headers";

import {
  createCheckoutToken,
  fastrrApiConfigured,
} from "@/lib/checkout/fastrr-api";
import { fastrrEligibility } from "@/lib/checkout/fastrr-cart";
import { CART_ATTRIBUTE, returnUrl } from "@/lib/checkout/fastrr-return";
import {
  applyDiscountCode,
  getCart,
  removeDiscountCode,
} from "@/lib/shopify/cart";
import { SITE_URL } from "@/lib/site";
import type { Cart } from "@/lib/shopify/types";

export type FastrrCheckoutResult =
  | { ok: true; token: string; orderId: string }
  /** `reason` is for logging. The caller sends the shopper to Shopify. */
  | { ok: false; reason: string };

/**
 * Puts a code the visitor earned earlier (the newsletter code) on the cart.
 *
 * Shopify's checkout takes it as a `?discount=` URL param; Fastrr has no such
 * door, so the only way to honour it is to let Shopify price it into the cart
 * before the cart is signed. Shopify still rules on it — an expired or
 * inapplicable code is taken straight back off, exactly as applyDiscount does.
 */
async function withClaimedCode(cart: Cart, code: string): Promise<Cart> {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,40}$/.test(normalized)) return cart;
  if (cart.discountCodes.some((discount) => discount.code === normalized)) {
    return cart;
  }

  try {
    const updated = await applyDiscountCode(cart, normalized);
    const accepted = updated.discountCodes.some(
      (discount) => discount.code === normalized && discount.applicable,
    );
    // Also taken back off if it left the shopper worse off — a code that
    // doesn't combine with a bundle could otherwise displace the bigger saving.
    const cheaper =
      Number(updated.cost.totalAmount.amount) <=
      Number(cart.cost.totalAmount.amount);

    return accepted && cheaper
      ? updated
      : await removeDiscountCode(updated, normalized);
  } catch {
    // A code that won't apply must never cost someone their checkout.
    return cart;
  }
}

/** Where Fastrr should send the shopper back to: this deployment, not always prod. */
async function requestOrigin(): Promise<string> {
  // Next rejects a Server Action whose Origin doesn't match its Host, so by
  // the time this runs the header is this app's own origin — which is what
  // makes a local or preview checkout return to itself rather than to prod.
  const origin = (await headers()).get("origin");
  return origin && /^https?:\/\/[^/]+$/.test(origin) ? origin : SITE_URL;
}

/**
 * Step 2 of the Fastrr flow: sign the visitor's cart and get a checkout token.
 *
 * The cart is read here from the visitor's own cookie rather than accepted
 * from the browser, so the prices and the discount that get signed are the
 * ones Shopify is holding — never ones a client claimed.
 *
 * Never throws. Every failure is a reason to use Shopify's checkout instead.
 */
export async function createFastrrCheckout(
  claimedCode?: string | null,
): Promise<FastrrCheckoutResult> {
  if (!fastrrApiConfigured()) return { ok: false, reason: "api-not-configured" };

  try {
    let cart = await getCart();
    if (!cart) return { ok: false, reason: "empty-cart" };

    if (claimedCode) cart = await withClaimedCode(cart, claimedCode);

    const eligibility = fastrrEligibility(cart);
    if (!eligibility.eligible) {
      return { ok: false, reason: eligibility.reason };
    }

    const { token, orderId } = await createCheckoutToken({
      cartData: eligibility.cartData,
      // The order webhook reads the cart back to recover line attributes
      // (custom artwork, the gift marker). Sent twice — see fastrr-return.ts.
      customAttributes: { [CART_ATTRIBUTE]: cart.id },
      redirectUrl: returnUrl(await requestOrigin(), cart.id),
    });

    return { ok: true, token, orderId };
  } catch (error) {
    console.error("Fastrr checkout token failed", error);
    return { ok: false, reason: "token-request-failed" };
  }
}
