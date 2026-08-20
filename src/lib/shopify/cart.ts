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
  earnedDiscountCodes,
  GIFT_ATTRIBUTE,
  GIFT_PRODUCT_HANDLE,
  GIFT_THRESHOLD,
  MANAGED_DISCOUNT_CODES,
  bundleBlocksGift,
} from "@/lib/offers";
import { getProduct, getSplitHandles } from "@/lib/shopify/products";
import { defaultVariant } from "@/lib/shopify/types";
import type { Attribute, Cart, CartMutationPayload } from "@/lib/shopify/types";

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
 * 1. **Shopify decides.** This nominates a code; whether it is worth anything
 *    is Shopify's call, reported back on `discountCodes[].applicable`. If the
 *    code doesn't exist yet — as none of them do until they're created in
 *    admin — Shopify marks it inapplicable and the cart is unchanged. The UI
 *    reads that flag rather than assuming the discount landed.
 *
 * 2. **Never clobber a code the customer typed.** A manually entered code
 *    (LIT100, a campaign code) is preserved; only codes this system owns are
 *    added and removed. Otherwise adding a fourth poster would silently strip
 *    the first-order discount someone had already applied.
 */
/**
 * The bundle codes this cart has earned, counting each ladder separately.
 *
 * Gift lines are excluded from the count: a gift the cart handed out must not
 * be what tips the customer onto the next bundle rung.
 */
async function earnedBundleCodes(cart: Cart): Promise<string[]> {
  const splitHandles = await getSplitHandles();

  let singleQuantity = 0;
  let splitQuantity = 0;

  for (const line of cart.lines.nodes) {
    if (line.attributes.some((attribute) => attribute.key === GIFT_ATTRIBUTE)) {
      continue;
    }
    if (splitHandles.has(line.merchandise.product.handle)) {
      splitQuantity += line.quantity;
    } else {
      singleQuantity += line.quantity;
    }
  }

  return earnedDiscountCodes({ singleQuantity, splitQuantity });
}

export async function syncCartDiscounts(cart: Cart): Promise<Cart> {
  const earned = await earnedBundleCodes(cart);

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
 * If that discount doesn't exist in admin, or a bundle has already claimed the
 * order's one allowed buy-X-get-Y, the guard below takes the line straight
 * back out rather than billing someone for a gift.
 *
 * The threshold is measured on what the CUSTOMER chose. Counting the gift's
 * own value toward the threshold would let a ₹300 order qualify on the
 * strength of the gift it hasn't earned.
 */
export async function syncCartGift(cart: Cart): Promise<Cart> {
  const existing = giftLines(cart);

  // Shopify applies only one buy-X-get-Y discount per order, and the bundle is
  // worth far more than the gift. A cart taking a bundle therefore gets no
  // gift line at all — adding one would put an item Shopify won't discount in
  // front of the customer at full price. See bundleBlocksGift.
  const earned = await earnedBundleCodes(cart);
  const qualifies =
    !bundleBlocksGift(earned) && customerSubtotal(cart) >= GIFT_THRESHOLD;

  if (!qualifies) {
    if (existing.length === 0) return cart;
    return removeCartLines(
      cart.id,
      existing.map((line) => line.id),
    );
  }

  // Qualifies, and the gift is already there — but only keep it if it is
  // actually free. A gift line the customer is being charged for is worse
  // than no gift at all.
  if (existing.length > 0) {
    const charged = existing.filter(
      (line) => Number(line.cost.totalAmount.amount) > 0,
    );
    if (charged.length === 0) return cart;

    return removeCartLines(
      cart.id,
      charged.map((line) => line.id),
    );
  }

  const product = await getProduct(GIFT_PRODUCT_HANDLE);
  const variant = product ? defaultVariant(product) : null;

  // No gift product published, or it's out of stock. Say nothing and carry on
  // — the order is still perfectly valid without it.
  if (!variant?.availableForSale) return cart;

  return addCartLines(cart.id, [
    {
      merchandiseId: variant.id,
      quantity: 1,
      attributes: [{ key: GIFT_ATTRIBUTE, value: "1" }],
    },
  ]);
}
