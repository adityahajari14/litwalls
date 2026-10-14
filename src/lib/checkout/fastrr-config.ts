/**
 * Shiprocket Checkout ("Fastrr") — the browser-safe half of the configuration.
 *
 * Fastrr replaces Shopify's hosted checkout with an on-site overlay that adds
 * COD, UPI, saved addresses and OTP login. This is their "custom website"
 * integration, which has four moving parts:
 *
 *   1. They pull our catalogue from /api/fastrr/* (lib/checkout/fastrr-catalog).
 *   2. On "Checkout" our server signs the cart and asks them for a one-time
 *      token (lib/checkout/fastrr-actions) — the secret never reaches a browser.
 *   3. Their script opens the overlay for that token (lib/checkout/start-checkout).
 *   4. They call our webhook when the order is placed, and we create the order
 *      in Shopify (lib/checkout/fastrr-order) — Shopify stays the order system.
 *
 * Unset `NEXT_PUBLIC_FASTRR_SELLER_DOMAIN` and every checkout button behaves
 * exactly as it did before — Shopify's hosted checkout. That is the switch to
 * pull if anything about Fastrr misbehaves in production.
 */

/**
 * The domain Shiprocket has our configuration saved against. Supplied by them
 * at onboarding; it is not necessarily the storefront's own hostname, which is
 * why it is configured rather than read from `window.location`.
 */
export const FASTRR_SELLER_DOMAIN =
  process.env.NEXT_PUBLIC_FASTRR_SELLER_DOMAIN ?? "";

/** `NEXT_PUBLIC_FASTRR_ENV=staging` moves the script AND the API to staging. */
export const FASTRR_IS_STAGING = process.env.NEXT_PUBLIC_FASTRR_ENV === "staging";

/**
 * Staging swaps both the script and the stylesheet. Their staging UI is served
 * from a Netlify preview, which is why the hosts are unrelated.
 */
const HOSTS = {
  production: {
    script: "https://checkout-ui.shiprocket.com/assets/js/channels/shopify.js",
    styles: "https://checkout-ui.shiprocket.com/assets/styles/shopify.css",
  },
  staging: {
    script: "https://customcheckoutfastrr.netlify.app/assets/js/channels/shopify.js",
    styles: "https://customcheckoutfastrr.netlify.app/assets/styles/shopify.css",
  },
} as const;

export const FASTRR_ASSETS = FASTRR_IS_STAGING ? HOSTS.staging : HOSTS.production;

export function isFastrrConfigured(): boolean {
  return FASTRR_SELLER_DOMAIN.length > 0;
}

/** What their script reports back. Only the close event is ever sent. */
export type FastrrCheckoutEvent = { event: string; exitCheckout?: boolean };

declare global {
  interface Window {
    HeadlessCheckout?: {
      /**
       * Opens the overlay for a token minted by the access-token API.
       *
       * The first argument is documented as the click event and ignored by the
       * shipped script. The fourth is undocumented but honoured: it is the only
       * way to observe a shopper closing the overlay without paying.
       */
      addToCart: (
        event: unknown,
        token: string,
        options?: {
          /** Where to send the shopper if their checkout is down. */
          fallbackUrl?: string;
          isInitiatedFromApp?: boolean;
        },
        callback?: (event: FastrrCheckoutEvent) => void,
      ) => void;
    };
  }
}

/** True once their script has attached its API to `window`. */
export function isFastrrReady(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.HeadlessCheckout?.addToCart === "function"
  );
}
