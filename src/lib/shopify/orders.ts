import "server-only";

import { admin } from "@/lib/shopify/admin";
import { ShopifyError } from "@/lib/shopify/client";

/**
 * Creating orders through the Admin API.
 *
 * Every other order in this store is created by Shopify's own checkout. These
 * exist for the one case where the checkout happened somewhere else — Fastrr —
 * and Shopify has to be told about an order that has already been paid for or
 * confirmed. See lib/checkout/fastrr-order.ts for what goes into one.
 */

export type OrderRef = { id: string; name: string };

export type MoneyBag = {
  shopMoney: { amount: string; currencyCode: string };
};

export function inr(amount: number): MoneyBag {
  return { shopMoney: { amount: amount.toFixed(2), currencyCode: "INR" } };
}

export type OrderAddress = {
  firstName?: string;
  lastName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  provinceCode?: string;
  zip?: string;
  countryCode?: string;
  phone?: string;
};

export type OrderInput = {
  currency: "INR";
  email?: string;
  phone?: string;
  note?: string;
  tags: string[];
  sourceIdentifier?: string;
  customAttributes?: { key: string; value: string }[];
  customer?: {
    toUpsert: { email: string; firstName?: string; lastName?: string };
  };
  lineItems: {
    variantId: string;
    quantity: number;
    /**
     * Must be sent. orderCreate does NOT take it from the variant: the first
     * live Fastrr order came out "Shipping not required" although every
     * variant in the store is a physical product, which keeps the order out
     * of a shipping app's queue.
     */
    requiresShipping: boolean;
    properties?: { name: string; value: string }[];
  }[];
  shippingAddress?: OrderAddress;
  billingAddress?: OrderAddress;
  shippingLines?: { title: string; priceSet: MoneyBag }[];
  discountCode?: {
    itemFixedDiscountCode: { code: string; amountSet: MoneyBag };
  };
  financialStatus: "PAID" | "PENDING";
  transactions?: {
    kind: "SALE";
    status: "SUCCESS" | "PENDING";
    gateway: string;
    amountSet: MoneyBag;
  }[];
};

const FIND_ORDER = /* GraphQL */ `
  query FindOrder($query: String!) {
    orders(first: 1, query: $query) {
      nodes {
        id
        name
      }
    }
  }
`;

/** The order carrying this tag, if one exists. Tags are how duplicates are caught. */
export async function findOrderByTag(tag: string): Promise<OrderRef | null> {
  const data = await admin<{ orders: { nodes: OrderRef[] } }>(FIND_ORDER, {
    query: `tag:'${tag}'`,
  });

  return data.orders.nodes[0] ?? null;
}

const VARIANTS = /* GraphQL */ `
  query Variants($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        price
        product {
          tags
        }
      }
    }
  }
`;

export type VariantFacts = { price: number; tags: string[] };

/**
 * What Shopify will charge for each variant right now, and its product's tags.
 *
 * Asked of Admin rather than the cached Storefront catalogue: the price feeds
 * the arithmetic that makes an order's total match what was actually paid, and
 * a ten-minute-old one would put that out by the difference. The tags are how
 * an order line is recognised as a custom print.
 */
export async function getVariants(
  variantIds: string[],
): Promise<Map<string, VariantFacts>> {
  const data = await admin<{
    nodes: ({ id?: string; price?: string; product?: { tags: string[] } } | null)[];
  }>(VARIANTS, { ids: [...new Set(variantIds)] });

  const variants = new Map<string, VariantFacts>();
  for (const node of data.nodes) {
    if (node?.id && node.price !== undefined) {
      variants.set(node.id, {
        price: Number(node.price),
        tags: node.product?.tags ?? [],
      });
    }
  }
  return variants;
}

const ORDER_CREATE = /* GraphQL */ `
  mutation OrderCreate(
    $order: OrderCreateOrderInput!
    $options: OrderCreateOptionsInput
  ) {
    orderCreate(order: $order, options: $options) {
      order {
        id
        name
      }
      userErrors {
        field
        message
      }
    }
  }
`;

type OrderCreateResponse = {
  orderCreate: {
    order: OrderRef | null;
    userErrors: { field: string[] | null; message: string }[];
  };
};

export async function createOrder(
  order: OrderInput,
  { sendReceipt }: { sendReceipt: boolean },
): Promise<OrderRef> {
  const data = await admin<OrderCreateResponse>(ORDER_CREATE, {
    order,
    options: {
      // The customer has already paid or confirmed; the order exists whether
      // or not Shopify's stock count agrees. Refusing to record it over
      // inventory would lose a real order to protect a number.
      inventoryBehaviour: "DECREMENT_IGNORING_POLICY",
      sendReceipt,
    },
  });

  const { order: created, userErrors } = data.orderCreate;

  if (userErrors.length || !created) {
    throw new ShopifyError(
      userErrors.map((error) => error.message).join("; ") ||
        "orderCreate returned no order",
      userErrors,
    );
  }

  return created;
}
