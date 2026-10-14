import type { FastrrOrder } from "@/lib/checkout/fastrr-api";

/**
 * How a Fastrr checkout stays tied to the Shopify cart it was made from.
 *
 * There is no database here, so the link has to ride on the Fastrr order
 * itself. It is written in two places because only one of them is documented
 * to come back: `redirect_url` is echoed by the order-details API in every
 * sample response; `custom_attributes` is accepted on the way in but its
 * return is unspecified.
 */

/** Key under `cart_data.custom_attributes`. */
export const CART_ATTRIBUTE = "shopify_cart_id";

/** Query param on the return URL. */
const CART_PARAM = "c";

/** Where the shopper lands after the overlay. Fastrr appends `oid` and `ost`. */
export const RETURN_PATH = "/checkout/return";

export function returnUrl(origin: string, cartId: string): string {
  const url = new URL(RETURN_PATH, origin);
  url.searchParams.set(CART_PARAM, cartId);
  return url.toString();
}

/** The Shopify cart a Fastrr order was signed from, if it can still be told. */
export function cartIdForOrder(order: FastrrOrder): string | null {
  const fromAttributes = order.cart_data?.custom_attributes?.[CART_ATTRIBUTE];
  if (fromAttributes) return fromAttributes;

  if (!order.redirect_url) return null;

  try {
    return new URL(order.redirect_url).searchParams.get(CART_PARAM);
  } catch {
    return null;
  }
}
