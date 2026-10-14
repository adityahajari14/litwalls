import "server-only";

import { createHmac } from "node:crypto";

import type { FastrrCartData } from "@/lib/checkout/fastrr-cart";
import { FASTRR_IS_STAGING } from "@/lib/checkout/fastrr-config";

/**
 * Shiprocket Checkout's signed API.
 *
 * Every request carries the API key and an HMAC of the exact body bytes, made
 * with the secret key. Both are **secrets** — the secret key can mint checkouts
 * at any price and trigger refunds — so this module is server-only and nothing
 * in it is ever handed to a browser. The browser only receives the short-lived
 * checkout token.
 */

const BASE_URL = FASTRR_IS_STAGING
  ? "https://fastrr-api-dev.pickrr.com"
  : "https://checkout-api.shiprocket.com";

/** Long enough for a slow day, short enough that "Checkout" never hangs. */
const TIMEOUT_MS = 10_000;

export class FastrrError extends Error {
  constructor(
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "FastrrError";
  }
}

export function fastrrApiConfigured(): boolean {
  return Boolean(process.env.FASTRR_API_KEY && process.env.FASTRR_SECRET_KEY);
}

function credentials() {
  const apiKey = process.env.FASTRR_API_KEY;
  const secretKey = process.env.FASTRR_SECRET_KEY;
  if (!apiKey || !secretKey) {
    throw new FastrrError(
      "Missing FASTRR_API_KEY / FASTRR_SECRET_KEY. Add them to .env.local — see README.md.",
    );
  }
  return { apiKey, secretKey };
}

/** Base64 HMAC-SHA256 — the format both directions of this API use. */
export function fastrrSignature(body: string, secretKey: string): string {
  return createHmac("sha256", secretKey).update(body).digest("base64");
}

async function post(path: string, payload: unknown): Promise<unknown> {
  const { apiKey, secretKey } = credentials();

  // Serialised once: the signature covers these exact bytes, so signing one
  // JSON.stringify and sending another would fail on any key-order difference.
  const body = JSON.stringify(payload);

  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // The bare key. Shiprocket's written guide shows a "Bearer " prefix,
      // which their API rejects with a 511.
      "X-Api-Key": apiKey,
      "X-Api-HMAC-SHA256": fastrrSignature(body, secretKey),
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await response.text();

  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Left null; reported below with the status.
  }

  if (!response.ok) {
    // 511 is how they answer a bad key or a bad signature.
    throw new FastrrError(`Fastrr ${path} returned ${response.status}`, json ?? text);
  }

  return json;
}

type Envelope<T> = { ok?: boolean; result?: T; error?: unknown };

/** Unwraps `{ ok, result, error }`, the envelope the checkout APIs share. */
async function call<T>(path: string, payload: unknown): Promise<T> {
  const body = (await post(path, payload)) as Envelope<T> | null;

  if (!body?.ok || body.result === undefined || body.result === null) {
    throw new FastrrError(`Fastrr ${path} did not succeed`, body);
  }

  return body.result;
}

/* ------------------------------------------------------------ checkout */

export type FastrrCheckoutToken = {
  token: string;
  /** Fastrr's id for this checkout — the same id the order webhook carries. */
  orderId: string;
};

/**
 * Asks Fastrr for a one-time token that opens the overlay for this cart.
 *
 * The token is valid for about 25 minutes and is the only thing the browser is
 * given. Because the cart is signed here, on the server, a shopper cannot edit
 * a price or a discount on its way to the checkout.
 */
export async function createCheckoutToken({
  cartData,
  customAttributes,
  redirectUrl,
}: {
  cartData: FastrrCartData;
  customAttributes?: Record<string, string>;
  /** Fastrr appends `oid` (order id) and `ost` (status) and sends the shopper here. */
  redirectUrl: string;
}): Promise<FastrrCheckoutToken> {
  const result = await call<{ token?: string; data?: { order_id?: string } }>(
    "/api/v1/access-token/checkout",
    {
      cart_data: {
        ...cartData,
        ...(customAttributes ? { custom_attributes: customAttributes } : {}),
        mobile_app: false,
      },
      redirect_url: redirectUrl,
      timestamp: new Date().toISOString(),
    },
  );

  if (!result.token || !result.data?.order_id) {
    throw new FastrrError("Fastrr returned no checkout token", result);
  }

  return { token: result.token, orderId: result.data.order_id };
}

/* --------------------------------------------------------------- orders */

export type FastrrAddress = {
  phone: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  pincode: string | null;
  state: string | null;
  country: string | null;
  country_code: string | null;
  landmark: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export type FastrrOrder = {
  order_id: string;
  cart_data: {
    items: { variant_id: string; quantity: number }[];
    custom_attributes?: Record<string, string> | null;
  } | null;
  redirect_url: string | null;
  /** CREATED / INITIATED / FAILED / SUCCESS. Only SUCCESS is a real order. */
  status: string;
  phone: string | null;
  email: string | null;
  shipping_plan: string | null;
  shipping_address: FastrrAddress | null;
  billing_address: FastrrAddress | null;
  shipping_charges: number | null;
  rto_prediction: string | null;
  edd: string | null;
  /** CASH_ON_DELIVERY / PREPAID */
  payment_type: string | null;
  payment_status: string | null;
  payments:
    | {
        txn_id: string | null;
        gateway: string | null;
        payment_method: string | null;
        pg_transaction_id: string | null;
      }[]
    | null;
  coupon_codes: string[] | null;
  prepaid_discount: number | null;
  total_discount: number | null;
  cod_charges: number | null;
  subtotal_price: number | null;
  total_amount_payable: number | null;
  /** The order's number in the Shiprocket panel. */
  fastrr_order_id: string | null;
  order_created_date: string | null;
};

/** Fastrr's own ids are 24-char hex. Checked before one is used in a query. */
export function isFastrrOrderId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
}

/**
 * The authoritative record of one checkout.
 *
 * This — not the webhook body — is what an order is built from. The webhook
 * arrives unsigned, so anything in it could have been written by anyone; this
 * is fetched over the signed API and cannot have been.
 */
export async function getFastrrOrder(orderId: string): Promise<FastrrOrder> {
  return call<FastrrOrder>("/api/v1/custom-platform-order/details", {
    order_id: orderId,
    timestamp: new Date().toISOString(),
  });
}

/** Ids of checkouts in a window, newest first. Used by the reconcile job. */
export async function listFastrrOrders({
  start,
  end,
  status = "SUCCESS",
  page = 0,
  limit = 250,
}: {
  start: Date;
  end: Date;
  status?: "SUCCESS" | "INITIATED";
  page?: number;
  limit?: number;
}): Promise<{ total: number; orders: { id: string; status: string }[] }> {
  const result = await call<{
    total?: number;
    data?: { id: string; status: string }[];
  }>("/api/v1/custom-platform-order/details/list", {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    timestamp: new Date().toISOString(),
    status,
    limit,
    page,
  });

  return { total: result.total ?? 0, orders: result.data ?? [] };
}

/* -------------------------------------------------------------- catalog */

/**
 * Tells Fastrr one product or collection changed, so it need not wait for its
 * next full pull of /api/fastrr/*. Same auth as everything else here.
 */
export async function pushCatalogUpdate(
  kind: "product" | "collection",
  payload: unknown,
): Promise<void> {
  const body = (await post(`/wh/v1/custom/${kind}`, payload)) as {
    ok?: boolean;
  } | null;

  if (!body?.ok) {
    throw new FastrrError(`Fastrr rejected the ${kind} update`, body);
  }
}
