import "server-only";

import {
  getFastrrOrder,
  type FastrrAddress,
  type FastrrOrder,
} from "@/lib/checkout/fastrr-api";
import { shopifyVariantId } from "@/lib/checkout/fastrr-cart";
import { cartIdForOrder } from "@/lib/checkout/fastrr-return";
import { CUSTOM_ART_ATTRIBUTE } from "@/lib/custom-poster";
import { GIFT_ATTRIBUTE } from "@/lib/offers";
import { isCustomProduct } from "@/lib/product";
import { getCartById } from "@/lib/shopify/cart";
import type { CartLine } from "@/lib/shopify/types";
import {
  createOrder,
  findOrderByTag,
  getVariants,
  inr,
  type OrderAddress,
  type OrderInput,
} from "@/lib/shopify/orders";

/**
 * Step 4 of the Fastrr flow: a checkout completed over there becomes an order
 * over here.
 *
 * Fastrr takes the payment and holds its own record, but everything this
 * business runs on — the order list, the customer's order history under
 * /account, stock, fulfilment — reads from Shopify. An order that exists only
 * in Fastrr is, for all practical purposes, an order nobody knows about.
 *
 * Three rules shape everything below:
 *
 * 1. **Built from the signed API, never from the webhook body.** The webhook
 *    arrives unsigned, so its body proves nothing. It is used for exactly one
 *    thing — the order id — which is then looked up over the authenticated
 *    API. A forged webhook can at most make us re-check an order that is
 *    already real.
 *
 * 2. **Once.** Their webhooks repeat, and the reconcile job re-walks recent
 *    orders by design. Every order is tagged `fastrr-<their id>` and that tag
 *    is looked for before anything is created.
 *
 * 3. **The Shopify total is what was actually charged.** Fastrr can add things
 *    Shopify never priced — a COD fee, a prepaid discount — so the discount on
 *    the Shopify order is worked backwards from the amount Fastrr collected,
 *    rather than restated from the cart and hoped to agree.
 */

export type EnsureResult =
  | { status: "created" | "exists"; shopifyOrder: string }
  | { status: "skipped"; reason: string };

/** `fastrr-<24 hex>` is 31 characters; Shopify allows a tag 40. */
function orderTag(orderId: string): string {
  return `fastrr-${orderId}`;
}

/** Flags an order a person should look at. Searchable in Shopify admin. */
const REVIEW_TAG = "fastrr-review";

function round2(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * "+91XXXXXXXXXX", or nothing.
 *
 * Shopify rejects the whole order over a phone it cannot parse, and Fastrr
 * returns address phones masked ("6302xxxxxx"). A missing phone is recoverable
 * — it is still on the Fastrr order — a missing order is not.
 */
function indianPhone(raw: string | null | undefined): string | undefined {
  if (!raw || /[^\d+\s()-]/.test(raw)) return undefined;

  const digits = raw.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : undefined;
}

function validEmail(raw: string | null | undefined): string | undefined {
  const email = raw?.trim();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

/**
 * Shopify's province codes for India. Its address input takes a code, not a
 * name, and Fastrr sends the name. Mostly ISO 3166-2, with Shopify's own
 * spellings where the two differ (TS, CG, OR, UK).
 */
const PROVINCE_CODES: Record<string, string> = {
  andamanandnicobarislands: "AN",
  andamanandnicobar: "AN",
  andhrapradesh: "AP",
  arunachalpradesh: "AR",
  assam: "AS",
  bihar: "BR",
  chandigarh: "CH",
  chhattisgarh: "CG",
  chattisgarh: "CG",
  dadraandnagarhaveli: "DN",
  dadraandnagarhavelianddamananddiu: "DN",
  damananddiu: "DD",
  delhi: "DL",
  newdelhi: "DL",
  nctofdelhi: "DL",
  goa: "GA",
  gujarat: "GJ",
  haryana: "HR",
  himachalpradesh: "HP",
  jammuandkashmir: "JK",
  jharkhand: "JH",
  karnataka: "KA",
  kerala: "KL",
  ladakh: "LA",
  lakshadweep: "LD",
  madhyapradesh: "MP",
  maharashtra: "MH",
  manipur: "MN",
  meghalaya: "ML",
  mizoram: "MZ",
  nagaland: "NL",
  odisha: "OR",
  orissa: "OR",
  puducherry: "PY",
  pondicherry: "PY",
  punjab: "PB",
  rajasthan: "RJ",
  sikkim: "SK",
  tamilnadu: "TN",
  telangana: "TS",
  tripura: "TR",
  uttarpradesh: "UP",
  uttarakhand: "UK",
  uttaranchal: "UK",
  westbengal: "WB",
};

function provinceCode(state: string | null | undefined): string | undefined {
  if (!state) return undefined;
  const key = state.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");
  return PROVINCE_CODES[key];
}

/**
 * A first and last name Shopify will accept.
 *
 * Shopify rejects a customer with a blank last name ("Customer last name can't
 * be blank") — found on the first live order, whose shopper had given Fastrr a
 * single name. A full name typed into the first-name field is split; a single
 * word is used for both, because the alternative is losing the customer link.
 */
function personName(
  first: string | null | undefined,
  last: string | null | undefined,
): { firstName?: string; lastName?: string } {
  const given = first?.trim() ?? "";
  const family = last?.trim() ?? "";

  if (family) return { firstName: given || undefined, lastName: family };
  if (!given) return {};

  const parts = given.split(/\s+/);
  return parts.length > 1
    ? { firstName: parts[0], lastName: parts.slice(1).join(" ") }
    : { firstName: given, lastName: given };
}

function toAddress(
  address: FastrrAddress | null | undefined,
  phone: string | undefined,
): OrderAddress | undefined {
  if (!address || !address.line1) return undefined;

  const line2 = [address.line2, address.landmark].filter(Boolean).join(", ");

  return {
    ...personName(address.first_name, address.last_name),
    address1: address.line1 ?? undefined,
    address2: line2 || undefined,
    city: address.city ?? undefined,
    provinceCode: provinceCode(address.state),
    zip: address.pincode ?? undefined,
    countryCode: address.country_code || "IN",
    // Their address phones come back masked; the order-level one does not.
    phone: indianPhone(address.phone) ?? phone,
  };
}

/**
 * The order's lines, with their Shopify line attributes put back.
 *
 * Fastrr's cart is variant ids and quantities — nothing else survives it. But
 * a custom print's artwork link lives on the cart LINE, as does the gift
 * marker, so the Shopify cart this checkout was signed from is read back and
 * its lines are used wherever they still describe what was sold.
 *
 * "Still describe" is judged one variant at a time: if the cart holds exactly
 * as many of a variant as Fastrr sold, those lines — attributes and all — are
 * the order's. So a shopper who added something else in another tab mid-
 * checkout does not cost their custom poster its artwork. Where the counts
 * disagree the cart is describing some other basket; that variant is built
 * bare from what Fastrr sold, and buildOrder flags it if it needed artwork.
 */
async function resolveLines(order: FastrrOrder): Promise<OrderInput["lineItems"]> {
  const sold = new Map<string, number>();
  for (const item of order.cart_data?.items ?? []) {
    const id = String(item.variant_id);
    sold.set(id, (sold.get(id) ?? 0) + item.quantity);
  }

  const cartId = cartIdForOrder(order);
  const cart = cartId ? await getCartById(cartId).catch(() => null) : null;

  const held = new Map<string, CartLine[]>();
  for (const line of cart?.lines.nodes ?? []) {
    const id = shopifyVariantId(line.merchandise.id);
    if (id) held.set(id, [...(held.get(id) ?? []), line]);
  }

  const lineItems: OrderInput["lineItems"] = [];

  for (const [id, quantity] of sold) {
    const lines = held.get(id) ?? [];
    const heldQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

    if (heldQuantity !== quantity) {
      lineItems.push({
        variantId: `gid://shopify/ProductVariant/${id}`,
        quantity,
      });
      continue;
    }

    for (const line of lines) {
      lineItems.push({
        variantId: line.merchandise.id,
        quantity: line.quantity,
        ...(line.attributes.length
          ? {
              properties: line.attributes.map((attribute) => ({
                name: attribute.key,
                value: attribute.value,
              })),
            }
          : {}),
      });
    }
  }

  return lineItems;
}

/**
 * Where the order is going.
 *
 * The signed order-details record is the source. The first live order came
 * back from it with no shipping address, so two fallbacks follow: the billing
 * address on the same signed record, and then the address in the webhook body.
 *
 * The webhook body is unsigned, which is why it is used only for an order the
 * signed record has already confirmed, and only when the body names the same
 * order and the same phone number. Someone who could forge it would still need
 * a real paid order id and that customer's number to redirect a parcel.
 */
function deliveryAddress(
  order: FastrrOrder,
  hint: unknown,
): FastrrAddress | null {
  if (order.shipping_address?.line1) return order.shipping_address;
  if (order.billing_address?.line1) return order.billing_address;

  const body = hint as Partial<FastrrOrder> | null | undefined;
  const digits = (value: unknown) =>
    typeof value === "string" ? value.replace(/\D/g, "").slice(-10) : "";

  if (
    body?.order_id === order.order_id &&
    digits(body.phone) !== "" &&
    digits(body.phone) === digits(order.phone) &&
    body.shipping_address?.line1
  ) {
    return body.shipping_address;
  }

  return null;
}

async function buildOrder(
  order: FastrrOrder,
  hint?: unknown,
): Promise<OrderInput> {
  const lineItems = await resolveLines(order);
  if (lineItems.length === 0) {
    throw new Error(`Fastrr order ${order.order_id} has no items`);
  }

  const notes: string[] = ["Placed through Shiprocket Checkout (Fastrr)."];
  const tags = ["Fastrr", orderTag(order.order_id)];
  let needsReview = false;

  // ---- money ----------------------------------------------------------
  const variants = await getVariants(lineItems.map((line) => line.variantId));

  let goods = 0;
  let missingArtwork = 0;

  for (const line of lineItems) {
    const variant = variants.get(line.variantId);
    if (!variant) {
      throw new Error(
        `Variant ${line.variantId} on Fastrr order ${order.order_id} no longer exists in Shopify`,
      );
    }
    goods += variant.price * line.quantity;

    // A custom print is nothing without its file. The cart refuses to hold
    // one (see artlessCustomLines), so this should be unreachable — which is
    // exactly why it is checked: if it ever happens, the order must not look
    // like every other order in the list.
    const has = (name: string) =>
      line.properties?.some((property) => property.name === name && property.value);

    if (
      isCustomProduct({ tags: variant.tags }) &&
      !has(CUSTOM_ART_ATTRIBUTE) &&
      !has(GIFT_ATTRIBUTE)
    ) {
      missingArtwork += line.quantity;
    }
  }

  if (missingArtwork > 0) {
    notes.push(
      `${missingArtwork} custom print(s) on this order have NO ARTWORK attached — the cart changed after checkout started. Contact the customer before printing.`,
    );
    tags.push("fastrr-missing-artwork");
    needsReview = true;
  }

  const shipping = order.shipping_charges ?? 0;
  const codFee = order.cod_charges ?? 0;
  const charged = round2(
    order.total_amount_payable ??
      goods + shipping + codFee - (order.total_discount ?? 0),
  );

  // Whatever separates Shopify's list prices from the amount Fastrr collected
  // IS the discount, by definition — so the two totals cannot disagree.
  let discount = round2(goods + shipping + codFee - charged);

  if (discount < 0) {
    notes.push(
      `Fastrr charged ₹${charged.toFixed(2)}, which is ₹${(-discount).toFixed(2)} more than Shopify's prices add up to. A price probably changed mid-checkout.`,
    );
    needsReview = true;
    discount = 0;
  } else if (discount > goods) {
    // Shopify applies an item discount to the items only.
    notes.push(
      `Fastrr's discount (₹${discount.toFixed(2)}) is more than the goods are worth; capped. Charged: ₹${charged.toFixed(2)}.`,
    );
    needsReview = true;
    discount = goods;
  }

  // ---- payment --------------------------------------------------------
  const isCod = order.payment_type === "CASH_ON_DELIVERY";
  const payment = order.payments?.[0];
  tags.push(isCod ? "COD" : "Prepaid");

  const transactions: OrderInput["transactions"] = isCod
    ? [
        {
          kind: "SALE",
          status: "PENDING",
          // Shopify's own name for its COD method — the string Shiprocket and
          // most courier apps look for to decide an order is collect-on-delivery.
          gateway: "Cash on Delivery (COD)",
          amountSet: inr(charged),
        },
      ]
    : [
        {
          kind: "SALE",
          status: "SUCCESS",
          gateway: payment?.gateway
            ? `Shiprocket Checkout (${payment.gateway})`
            : "Shiprocket Checkout",
          amountSet: inr(charged),
        },
      ];

  // ---- people ---------------------------------------------------------
  const phone = indianPhone(order.phone);
  const delivery = deliveryAddress(order, hint);
  const email = validEmail(order.email ?? delivery?.email);
  const shippingAddress = toAddress(delivery, phone);
  const billingAddress =
    toAddress(order.billing_address, phone) ?? shippingAddress;

  if (!shippingAddress) {
    // Logged as field NAMES only, never values: enough to see what Fastrr
    // sent without putting a customer's address in the server log.
    console.warn(
      `Fastrr order ${order.order_id}: no usable shipping address. Fields present: ${Object.keys(order).join(", ")}`,
    );
    notes.push(
      "NO SHIPPING ADDRESS was received from Fastrr. Copy it from the Fastrr dashboard before shipping.",
    );
    needsReview = true;
  }

  const customAttributes = [
    { key: "Fastrr order id", value: order.order_id },
    { key: "Shiprocket order id", value: order.fastrr_order_id ?? "" },
    { key: "Payment method", value: payment?.payment_method ?? order.payment_type ?? "" },
    { key: "Payment reference", value: payment?.pg_transaction_id ?? payment?.txn_id ?? "" },
    { key: "RTO risk", value: order.rto_prediction ?? "" },
    { key: "Phone", value: order.phone ?? "" },
  ].filter((attribute) => attribute.value);

  if (needsReview) tags.push(REVIEW_TAG);

  return {
    currency: "INR",
    // With an email the customer is upserted and the order's contact details
    // follow from that; without one, the phone is all there is to go on.
    ...(email
      ? {
          customer: {
            toUpsert: {
              email,
              ...personName(delivery?.first_name, delivery?.last_name),
            },
          },
        }
      : phone
        ? { phone }
        : {}),
    note: notes.join(" "),
    tags,
    sourceIdentifier: order.order_id,
    customAttributes,
    lineItems,
    shippingAddress,
    billingAddress,
    shippingLines: [
      { title: order.shipping_plan || "Standard", priceSet: inr(shipping) },
      ...(codFee > 0 ? [{ title: "COD charges", priceSet: inr(codFee) }] : []),
    ],
    ...(discount > 0
      ? {
          discountCode: {
            itemFixedDiscountCode: {
              code: order.coupon_codes?.join("+") || "FASTRR",
              amountSet: inr(discount),
            },
          },
        }
      : {}),
    financialStatus: isCod ? "PENDING" : "PAID",
    transactions,
  };
}

/**
 * The same order with everything Shopify is known to be strict about removed.
 *
 * Shopify refuses an entire order over one field it dislikes — a phone number
 * someone else's customer record already owns, an email it won't accept. None
 * of those is worth losing a paid order for, so a rejected order is retried
 * once without them, flagged for someone to fill in by hand.
 */
function stripped(input: OrderInput, order: FastrrOrder, why: string): OrderInput {
  const withoutPhone = (address?: OrderAddress) =>
    address ? { ...address, phone: undefined } : undefined;

  const retry: OrderInput = {
    ...input,
    // Still emailed their receipt — just not linked to a customer record.
    ...(input.customer ? { email: input.customer.toUpsert.email } : {}),
    shippingAddress: withoutPhone(input.shippingAddress),
    billingAddress: withoutPhone(input.billingAddress),
    tags: [...new Set([...input.tags, REVIEW_TAG])],
    note: `${input.note} Created without customer/phone details after Shopify rejected them (${why}). Phone: ${order.phone ?? "see Fastrr"}.`,
  };

  delete retry.customer;
  delete retry.phone;
  return retry;
}

async function sync(orderId: string, hint?: unknown): Promise<EnsureResult> {
  const order = await getFastrrOrder(orderId);

  // INITIATED is an opened checkout, FAILED a declined payment. Neither is an
  // order, and most INITIATED ones never become one.
  if (order.status !== "SUCCESS") {
    return { status: "skipped", reason: `status-${order.status}` };
  }

  const existing = await findOrderByTag(orderTag(order.order_id));
  if (existing) return { status: "exists", shopifyOrder: existing.name };

  const input = await buildOrder(order, hint);
  const sendReceipt = Boolean(input.customer);

  try {
    const created = await createOrder(input, { sendReceipt });
    return { status: "created", shopifyOrder: created.name };
  } catch (error) {
    const why = error instanceof Error ? error.message : "unknown error";
    console.error(`Fastrr order ${orderId}: Shopify rejected it, retrying stripped`, error);

    const created = await createOrder(stripped(input, order, why), {
      sendReceipt,
    });
    return { status: "created", shopifyOrder: created.name };
  }
}

/** Orders being created right now, so two callers share one attempt. */
const inFlight = new Map<string, Promise<EnsureResult>>();

/**
 * Makes sure a Fastrr order exists in Shopify. Safe to call any number of
 * times for the same id; throws only when Fastrr or Shopify could not be
 * reached, so the caller can answer the webhook with a 5xx and be retried.
 *
 * A caveat worth knowing: the duplicate check reads Shopify's order search,
 * which trails a new order by a few seconds. Two deliveries of the same
 * webhook inside that window, on two different server instances, could each
 * create the order. `inFlight` closes that window within one instance; across
 * instances it would take a database this app does not have. Retries from
 * Fastrr arrive well outside it, and a duplicate is visible at a glance — both
 * carry the same `fastrr-<id>` tag.
 */
export function ensureShopifyOrder(
  orderId: string,
  /** The webhook body, when there is one. See deliveryAddress for its limits. */
  hint?: unknown,
): Promise<EnsureResult> {
  const pending = inFlight.get(orderId);
  if (pending) return pending;

  const attempt = sync(orderId, hint).finally(() => inFlight.delete(orderId));
  inFlight.set(orderId, attempt);
  return attempt;
}
