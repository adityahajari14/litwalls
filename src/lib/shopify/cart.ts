import "server-only";

import { cookies } from "next/headers";

import { storefront, ShopifyError } from "@/lib/shopify/client";
import {
  ADD_CART_LINES,
  CREATE_CART,
  GET_CART,
  REMOVE_CART_LINES,
  UPDATE_CART_DISCOUNTS,
  UPDATE_CART_LINES,
} from "@/lib/shopify/queries";
import {
  appliedBundle,
  bundleQuantities,
  DEFAULT_GIFT_OPTION,
  earnedDiscountCodes,
  GIFT_ATTRIBUTE,
  GIFT_CHOICE_COOKIE,
  GIFT_OPTIONS,
  GIFT_THRESHOLD,
  MANAGED_DISCOUNT_CODES,
} from "@/lib/offers";
import { CUSTOM_ART_ATTRIBUTE } from "@/lib/custom-poster";
import { isCustomProduct } from "@/lib/product";
import { getProduct } from "@/lib/shopify/products";
import { defaultVariant } from "@/lib/shopify/types";
import type {
  Attribute,
  Cart,
  CartLine,
  CartMutationPayload,
} from "@/lib/shopify/types";

/**
 * A line to add to the cart. `attributes` rides along as line-item properties
 * — Shopify carries them onto the order, which is how a custom poster's
 * artwork URL reaches fulfilment.
 */
export type CartLineInput = {
  merchandiseId: string;
  quantity: number;
  attributes?: Attribute[];
};

export const CART_COOKIE = "litwalls_cart_id";

/** Shopify expires idle carts after 10 days; match it so we never hold a dead id. */
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 10;

export async function getCartId() {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

/** Only callable from a Server Action or Route Handler. */
export async function setCartId(id: string) {
  const store = await cookies();
  store.set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
}

export async function clearCartId() {
  const store = await cookies();
  store.delete(CART_COOKIE);
}

/** The customer's chosen gift, falling back to the default for anyone who
 *  hasn't picked yet (or whose cookie holds a since-removed option id). */
export async function getGiftChoice(): Promise<string> {
  const store = await cookies();
  const value = store.get(GIFT_CHOICE_COOKIE)?.value;
  return GIFT_OPTIONS.some((option) => option.id === value)
    ? value!
    : DEFAULT_GIFT_OPTION;
}

/** Only callable from a Server Action or Route Handler. */
export async function setGiftChoice(id: string) {
  const store = await cookies();
  store.set(GIFT_CHOICE_COOKIE, id, {
    // Not httpOnly — see the comment on GIFT_CHOICE_COOKIE in offers.ts.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
}

function unwrap(payload: CartMutationPayload): Cart {
  if (payload.userErrors.length) {
    throw new ShopifyError(
      payload.userErrors.map((error) => error.message).join("; "),
      payload.userErrors,
    );
  }
  if (!payload.cart) {
    throw new ShopifyError("Cart mutation returned no cart");
  }
  return payload.cart;
}

/**
 * Reads the current cart. Returns null when there is no cart cookie, or when
 * the id is stale — Shopify answers `cart: null` for an expired or completed
 * cart, and we must not treat that as an error.
 */
export async function getCart(): Promise<Cart | null> {
  const id = await getCartId();
  if (!id) return null;

  return getCartById(id);
}

/**
 * Reads a cart by id rather than from the visitor's cookie — for the Fastrr
 * order webhook, which runs with no visitor and so no cookie.
 */
export async function getCartById(id: string): Promise<Cart | null> {
  const data = await storefront<{ cart: Cart | null }>(GET_CART, {
    variables: { id },
  });

  return data.cart;
}

export async function createCart(lines: CartLineInput[] = []): Promise<Cart> {
  const data = await storefront<{ cartCreate: CartMutationPayload }>(
    CREATE_CART,
    { variables: { lines } },
  );

  return unwrap(data.cartCreate);
}

export async function addCartLines(
  cartId: string,
  lines: CartLineInput[],
): Promise<Cart> {
  const data = await storefront<{ cartLinesAdd: CartMutationPayload }>(
    ADD_CART_LINES,
    { variables: { cartId, lines } },
  );

  return unwrap(data.cartLinesAdd);
}

export async function updateCartLines(
  cartId: string,
  lines: { id: string; quantity: number }[],
): Promise<Cart> {
  const data = await storefront<{ cartLinesUpdate: CartMutationPayload }>(
    UPDATE_CART_LINES,
    { variables: { cartId, lines } },
  );

  return unwrap(data.cartLinesUpdate);
}

export async function removeCartLines(
  cartId: string,
  lineIds: string[],
): Promise<Cart> {
  const data = await storefront<{ cartLinesRemove: CartMutationPayload }>(
    REMOVE_CART_LINES,
    { variables: { cartId, lineIds } },
  );

  return unwrap(data.cartLinesRemove);
}


export async function updateCartDiscounts(
  cartId: string,
  discountCodes: string[],
): Promise<Cart> {
  const data = await storefront<{
    cartDiscountCodesUpdate: CartMutationPayload;
  }>(UPDATE_CART_DISCOUNTS, { variables: { cartId, discountCodes } });

  return unwrap(data.cartDiscountCodesUpdate);
}

/**
 * Puts the bundle discount the cart has earned onto the cart.
 *
 * Called after every line change, so "buy 4 get 3 free" applies itself the
 * moment the seventh poster goes in, and steps back down if the customer
 * removes one. The customer never types a code.
 *
 * Two rules this must not break:
 *
 * 1. **Shopify decides.** This nominates codes; whether one is worth anything
 *    is Shopify's call, reported back on `discountCodes[].applicable`. A code
 *    that doesn't exist, or whose collections don't cover what is in the cart,
 *    comes back inapplicable and the cart is unchanged. The UI reads that flag
 *    rather than assuming the discount landed.
 *
 * 2. **Never clobber a code the customer typed.** A manually entered code
 *    (LIT100, a campaign code) is preserved; only codes this system owns are
 *    added and removed. Otherwise adding a fourth poster would silently strip
 *    the first-order discount someone had already applied.
 */
export async function syncCartDiscounts(cart: Cart): Promise<Cart> {
  const earned = earnedDiscountCodes(bundleQuantities(cart));

  // Everything this system owns, so we know which existing codes are ours to
  // drop and which belong to the customer.
  const managed = new Set(MANAGED_DISCOUNT_CODES);
  const customerCodes = cart.discountCodes
    .map((discount) => discount.code)
    .filter((code) => !managed.has(code));

  const next = [...customerCodes, ...earned];
  const current = cart.discountCodes.map((discount) => discount.code);

  // Shopify replaces the whole list on every call, so skip the round trip when
  // nothing would change. Order matters for the comparison, not to Shopify.
  const unchanged =
    next.length === current.length &&
    next.every((code, index) => code === current[index]);
  if (unchanged) return cart;

  try {
    return await updateCartDiscounts(cart.id, next);
  } catch {
    // A discount failure must never cost someone their cart. Return the cart
    // as it stands and let them check out at full price rather than showing
    // an error on an action they didn't take.
    return cart;
  }
}


/**
 * Adds a code the customer typed, keeping everything already on the cart.
 *
 * Whether the code is real, live, and applicable to this cart is Shopify's
 * decision — the returned cart carries the verdict on
 * `discountCodes[].applicable`, and the caller reports that rather than
 * assuming success. Shopify accepts an unknown code without error, so a
 * missing `applicable` check would silently tell the customer it worked.
 */
export async function applyDiscountCode(
  cart: Cart,
  code: string,
): Promise<Cart> {
  const normalized = code.trim().toUpperCase();
  const existing = cart.discountCodes.map((discount) => discount.code);
  if (existing.includes(normalized)) return cart;

  return updateCartDiscounts(cart.id, [...existing, normalized]);
}

/** Removes one code, leaving the rest — including auto-applied ones — alone. */
export async function removeDiscountCode(
  cart: Cart,
  code: string,
): Promise<Cart> {
  const next = cart.discountCodes
    .map((discount) => discount.code)
    .filter((existing) => existing !== code);

  return updateCartDiscounts(cart.id, next);
}


/**
 * Custom-print lines with no artwork attached.
 *
 * A custom print IS its artwork: without the file there is nothing to print,
 * and the order is one that can only be resolved by emailing the customer.
 * The upload form never produces such a line, but the cart is not the upload
 * form — any "add to cart" button that is handed a custom variant makes one.
 *
 * The free gift is exempt. It is added by this system, marked as such, and
 * happens to be one of the custom-print products.
 */
export function artlessCustomLines(cart: Cart): CartLine[] {
  return cart.lines.nodes.filter((line) => {
    if (!isCustomProduct(line.merchandise.product)) return false;

    const has = (key: string) =>
      line.attributes.some((attribute) => attribute.key === key && attribute.value);

    return !has(CUSTOM_ART_ATTRIBUTE) && !has(GIFT_ATTRIBUTE);
  });
}

/**
 * Takes artless custom lines back out. Returns the lines removed so a caller
 * can tell the customer why something they just added is not there.
 */
export async function withoutArtlessCustomLines(
  cart: Cart,
): Promise<{ cart: Cart; removed: CartLine[] }> {
  const removed = artlessCustomLines(cart);
  if (removed.length === 0) return { cart, removed };

  return {
    cart: await removeCartLines(
      cart.id,
      removed.map((line) => line.id),
    ),
    removed,
  };
}

/** Lines this system put in the cart, rather than the customer. */
function giftLines(cart: Cart) {
  return cart.lines.nodes.filter((line) =>
    line.attributes.some((attribute) => attribute.key === GIFT_ATTRIBUTE),
  );
}

/** What the customer actually chose, ignoring anything we added for them. */
function customerSubtotal(cart: Cart): number {
  return cart.lines.nodes
    .filter(
      (line) =>
        !line.attributes.some((attribute) => attribute.key === GIFT_ATTRIBUTE),
    )
    .reduce((sum, line) => sum + Number(line.cost.subtotalAmount.amount), 0);
}

/**
 * Puts the free gift in the cart once the order qualifies, and takes it back
 * out when it no longer does.
 *
 * Shopify will not add a free item on its own — a buy-X-get-Y discount whose
 * "get" product isn't in the cart is inapplicable, full stop. So this adds the
 * line and the automatic gift discount in Shopify makes it cost nothing.
 *
 * If that discount doesn't exist in admin, or doesn't cover this basket,
 * `withoutChargedGift` takes the line straight back out rather than billing
 * someone for a gift. That guard was described here for a long time without
 * existing: the line stayed in the cart at full price while the drawer
 * labelled it "Free".
 *
 * Expects a cart whose bundle codes are already settled (syncCartDiscounts
 * runs first) — whether a bundle is being taken is read off Shopify's verdict,
 * and Shopify applies only one buy-X-get-Y per order, so a cart taking a
 * bundle gets no gift line at all.
 *
 * The threshold is measured on what the CUSTOMER chose. Counting the gift's
 * own value toward the threshold would let a ₹300 order qualify on the
 * strength of the gift it hasn't earned.
 *
 * Which product is added follows `getGiftChoice()` — the customer picks
 * between GIFT_OPTIONS in the cart drawer, and every reconcile re-checks that
 * the cart actually holds the one they most recently chose, swapping it out
 * if not (a poster added after they picked doesn't re-run this on its own).
 */
export async function syncCartGift(cart: Cart): Promise<Cart> {
  const existing = giftLines(cart);

  const qualifies =
    appliedBundle(cart) === null && customerSubtotal(cart) >= GIFT_THRESHOLD;

  if (!qualifies) {
    if (existing.length === 0) return cart;
    return removeCartLines(
      cart.id,
      existing.map((line) => line.id),
    );
  }

  const chosenId = await getGiftChoice();
  const chosen =
    GIFT_OPTIONS.find((option) => option.id === chosenId) ?? GIFT_OPTIONS[0];

  // Already exactly right — the chosen product, alone, and actually free.
  // Anything else (wrong product, a stale second line, one Shopify is
  // charging for because the discount isn't configured) gets cleared below
  // and re-added, rather than patched in place.
  if (
    existing.length === 1 &&
    existing[0].merchandise.product.handle === chosen.handle &&
    Number(existing[0].cost.totalAmount.amount) === 0
  ) {
    return cart;
  }

  if (existing.length > 0) {
    cart = await removeCartLines(
      cart.id,
      existing.map((line) => line.id),
    );
  }

  const product = await getProduct(chosen.handle);
  const variant = product ? defaultVariant(product) : null;

  // No gift product published, or it's out of stock. Say nothing and carry on
  // — the order is still perfectly valid without it.
  if (!variant?.availableForSale) return cart;

  const withGift = await addCartLines(cart.id, [
    {
      merchandiseId: variant.id,
      quantity: 1,
      attributes: [{ key: GIFT_ATTRIBUTE, value: "1" }],
    },
  ]);

  return withoutChargedGift(withGift);
}

/**
 * Removes any gift line Shopify is charging for.
 *
 * The storefront can add the line; only a Shopify discount can make it free.
 * If the automatic gift discount is missing, paused, or scoped so that it
 * doesn't cover this basket, the line comes back at full price — and a "free
 * gift" that adds ₹99 to the total is far worse than no gift.
 */
async function withoutChargedGift(cart: Cart): Promise<Cart> {
  const charged = giftLines(cart).filter(
    (line) => Number(line.cost.totalAmount.amount) > 0,
  );
  if (charged.length === 0) return cart;

  return removeCartLines(
    cart.id,
    charged.map((line) => line.id),
  );
}
