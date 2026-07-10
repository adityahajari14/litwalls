import "server-only";

import { cookies } from "next/headers";

import { storefront, ShopifyError } from "@/lib/shopify/client";
import {
  ADD_CART_LINES,
  CREATE_CART,
  GET_CART,
  REMOVE_CART_LINES,
  UPDATE_CART_LINES,
} from "@/lib/shopify/queries";
import type { Cart, CartMutationPayload } from "@/lib/shopify/types";

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

export async function createCart(
  lines: { merchandiseId: string; quantity: number }[] = [],
): Promise<Cart> {
  const data = await storefront<{ cartCreate: CartMutationPayload }>(
    CREATE_CART,
    { variables: { lines } },
  );

  return unwrap(data.cartCreate);
}

export async function addCartLines(
  cartId: string,
  lines: { merchandiseId: string; quantity: number }[],
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
