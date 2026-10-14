import "server-only";

import type { PurchaseSummary } from "@/lib/analytics/purchase";
import { getFastrrOrder, type FastrrOrder } from "@/lib/checkout/fastrr-api";
import { storefront } from "@/lib/shopify/client";

/**
 * What the confirmation page may know about an order.
 *
 * The page is reachable by anyone holding the order id in its URL, so this is
 * the whole of what it gets: money, timing and what was bought. The name,
 * phone, email and address on the Fastrr order stay on the server.
 */
export type OrderConfirmation = {
  status: "confirmed" | "unpaid";
  isCod: boolean;
  /** ISO date Fastrr expects delivery by, when it offers one. */
  expectedBy: string | null;
  purchase: PurchaseSummary;
};

const VARIANT_SUMMARIES = /* GraphQL */ `
  query VariantSummaries($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        title
        price {
          amount
        }
        product {
          title
        }
      }
    }
  }
`;

type VariantSummary = {
  id: string;
  title: string;
  price: { amount: string };
  product: { title: string };
};

/** Names and prices for the trackers. A failure here costs detail, not the page. */
async function describeItems(
  order: FastrrOrder,
): Promise<PurchaseSummary["items"]> {
  const items = order.cart_data?.items ?? [];
  const gid = (id: string) => `gid://shopify/ProductVariant/${id}`;

  let variants = new Map<string, VariantSummary>();
  try {
    const data = await storefront<{ nodes: (VariantSummary | null)[] }>(
      VARIANT_SUMMARIES,
      {
        variables: { ids: items.map((item) => gid(String(item.variant_id))) },
        revalidate: 60 * 10,
        tags: ["products"],
      },
    );
    variants = new Map(
      data.nodes
        .filter((node): node is VariantSummary => Boolean(node?.id))
        .map((node) => [node.id, node]),
    );
  } catch {
    // Fall through with ids only.
  }

  return items.map((item) => {
    const variantGid = gid(String(item.variant_id));
    const variant = variants.get(variantGid);

    return {
      variantGid,
      name: variant?.product.title ?? "Poster",
      variant: variant?.title ?? "",
      price: variant ? Number(variant.price.amount) : 0,
      quantity: item.quantity,
    };
  });
}

/** Null when Fastrr cannot be reached or has no such order. */
export async function getOrderConfirmation(
  orderId: string,
): Promise<OrderConfirmation | null> {
  let order: FastrrOrder;
  try {
    order = await getFastrrOrder(orderId);
  } catch {
    return null;
  }

  return {
    status: order.status === "SUCCESS" ? "confirmed" : "unpaid",
    isCod: order.payment_type === "CASH_ON_DELIVERY",
    expectedBy: order.edd,
    purchase: {
      orderId: order.order_id,
      value: Math.round((order.total_amount_payable ?? 0) * 100) / 100,
      currency: "INR",
      shipping: order.shipping_charges ?? 0,
      coupon: order.coupon_codes?.join("+") || null,
      items: order.status === "SUCCESS" ? await describeItems(order) : [],
    },
  };
}
