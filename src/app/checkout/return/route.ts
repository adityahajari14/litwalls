import { redirect } from "next/navigation";

import { getFastrrOrder, isFastrrOrderId } from "@/lib/checkout/fastrr-api";
import { cartIdForOrder } from "@/lib/checkout/fastrr-return";
import { clearCartId, getCartId } from "@/lib/shopify/cart";

/**
 * Where Fastrr sends the shopper when its overlay is done — the `redirect_url`
 * signed into the checkout token, with `oid` (their order id) and `ost` (its
 * status) appended.
 *
 * A route handler rather than the confirmation page itself because one thing
 * has to happen that a page render cannot do: retiring the cart cookie. The
 * Shopify cart was never checked out as far as Shopify knows, so left alone it
 * would greet the customer on the next page with the posters they just bought.
 *
 * It also keeps the cart id — which rides in on this URL — out of the address
 * bar and out of every analytics page view: the shopper is moved straight on
 * to /checkout/complete with nothing but the order id.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const orderId = params.get("oid");

  if (!isFastrrOrderId(orderId)) redirect("/");

  if (params.get("ost") === "SUCCESS") {
    try {
      // The query string says SUCCESS; only the signed API is believed. And
      // the cart is only dropped if it is the one this order was made from —
      // otherwise a crafted link could empty anyone's basket.
      const order = await getFastrrOrder(orderId);
      const cartId = await getCartId();

      if (order.status === "SUCCESS" && cartId && cartIdForOrder(order) === cartId) {
        await clearCartId();
      }
    } catch (error) {
      // The confirmation page copes with an order it cannot read; a stale
      // cart is an annoyance, not a reason to show an error after payment.
      console.error(`Fastrr return: could not verify ${orderId}`, error);
    }
  }

  redirect(`/checkout/complete?oid=${orderId}`);
}
