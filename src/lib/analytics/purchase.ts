/**
 * A completed order, reduced to what the trackers need.
 *
 * Deliberately free of anything personal — no name, phone, email or address.
 * It is built on the server from the Fastrr order and handed to a client
 * component, so whatever is in here ends up in page source.
 */
export type PurchaseSummary = {
  /** Fastrr's order id. Doubles as the dedupe key for both trackers. */
  orderId: string;
  value: number;
  currency: string;
  shipping: number;
  coupon: string | null;
  items: {
    /** Storefront GID — what the Meta events on this site key on. */
    variantGid: string;
    name: string;
    variant: string;
    price: number;
    quantity: number;
  }[];
};
