import "server-only";

/**
 * Storefront credentials are public-scope (safe to send from a browser) but
 * there is no reason to ship them to the client, so this module is
 * server-only and every caller lives on the server.
 *
 * Customer Account API credentials are confidential — this app is a
 * server-rendered Next.js app, not a public/SPA client, so the OAuth token
 * exchange uses a client secret over HTTP Basic auth rather than PKCE.
 */

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local — see README.md for how to set it up.`,
    );
  }
  return value;
}

/** Pinned so a new Shopify release can't silently change the response shape. */
export const STOREFRONT_API_VERSION = "2025-01";
export const CUSTOMER_ACCOUNT_API_VERSION = "2025-01";
export const ADMIN_API_VERSION = "2025-01";

function storeOrigin() {
  const store = required("SHOPIFY_STORE_DOMAIN");
  const origin = /^https?:\/\//.test(store) ? store : `https://${store}`;
  return origin.replace(/\/$/, "");
}

/**
 * Both the Storefront API and the Headless channel's Storefront token share
 * this domain. Re-issuing the token through the Headless channel (instead of
 * a bare custom app) is what makes New Customer Accounts available.
 */
export function storefrontConfig() {
  return {
    endpoint: `${storeOrigin()}/api/${STOREFRONT_API_VERSION}/graphql.json`,
    accessToken: required("SHOPIFY_STOREFRONT_ACCESS_TOKEN"),
  };
}

/**
 * The Admin API — used to mint staged upload targets for custom poster
 * artwork, and to create the Shopify order for a checkout completed on Fastrr.
 * The Storefront API can do neither: there is no public-scope way to put a
 * file or an order into a store, by design.
 *
 * This token is a **secret**. It grants write access to the store, so it must
 * never reach the browser. Everything that reads it lives behind "server-only",
 * and the browser is only ever handed the short-lived, single-purpose upload
 * URL that stagedUploadsCreate returns.
 *
 * From Shopify admin: Settings → Apps and sales channels → Develop apps →
 * your app → Admin API access token. Needs `write_files`, plus `write_orders`,
 * `read_products` and `write_customers` for Fastrr orders.
 */
export function adminConfig() {
  return {
    endpoint: `${storeOrigin()}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    accessToken: required("SHOPIFY_ADMIN_ACCESS_TOKEN"),
  };
}

/**
 * From Shopify admin: Sales channels → Headless → your storefront →
 * Customer Account API settings.
 * - Client ID / Client Secret: "Credentials" section.
 * - Shop ID: "Application endpoints" section (the identifier the Customer
 *   Account API's OIDC discovery document is served from — copy it
 *   verbatim, it is not the same string as SHOPIFY_STORE_DOMAIN).
 */
export function customerAccountConfig() {
  return {
    shopId: required("SHOPIFY_CUSTOMER_ACCOUNT_API_SHOP_ID"),
    clientId: required("SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID"),
    clientSecret: required("SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_SECRET"),
    redirectUri: required("SHOPIFY_CUSTOMER_ACCOUNT_API_REDIRECT_URI"),
  };
}
