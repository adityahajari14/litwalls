"use client";

import { withGaLinker } from "@/lib/analytics/ga-linker";
import { trackGaBeginCheckout } from "@/lib/analytics/google-analytics";
import { trackMetaInitiateCheckout } from "@/lib/analytics/meta-pixel";
import { claimedDiscount, withClaimedDiscount } from "@/lib/checkout-url";
import { createFastrrCheckout } from "@/lib/checkout/fastrr-actions";
import { fastrrEligibility } from "@/lib/checkout/fastrr-cart";
import {
  FASTRR_SELLER_DOMAIN,
  isFastrrConfigured,
  isFastrrReady,
} from "@/lib/checkout/fastrr-config";
import type { Cart } from "@/lib/shopify/types";

/**
 * The one place checkout starts.
 *
 * Three buttons used to each build their own `window.location.href` — the cart
 * drawer, "Buy now" on the product page, and "Buy now" on the custom upload
 * form. Fastrr adds a second destination and a set of conditions for choosing
 * between them, and that decision must not be made three times in three
 * slightly different ways.
 *
 * Order of preference, and why:
 *
 *   1. Fastrr, when it is configured, loaded, the cart can be represented in
 *      it, and our server could get a checkout token for it. This is the path
 *      that gains COD and UPI.
 *   2. Shopify's hosted checkout, byte for byte what every shopper got before
 *      this integration existed. Used whenever (1) does not hold — including
 *      when Fastrr's own script failed to load or its API is down.
 *
 * Even inside (1) the Shopify checkout URL is handed to Fastrr as
 * `fallbackUrl`, so an outage on their side after the overlay opens still
 * lands the shopper on our previous checkout.
 */

export type CheckoutOutcome = {
  /** Which checkout the shopper was actually sent to. */
  via: "fastrr" | "shopify";
  /** Present when Fastrr was skipped — for logging, never shown to shoppers. */
  reason?: string;
};

/**
 * Why Fastrr was skipped, in words, and what to do about it.
 *
 * Every one of these is a deliberate hand-off rather than a fault, which is
 * exactly why they need explaining: from the outside "it still goes to
 * Shopify" looks identical whether the integration is misconfigured or working
 * precisely as designed. Without this the only way to tell the two apart is to
 * read the source.
 */
const REASONS: Record<string, string> = {
  "not-configured":
    "NEXT_PUBLIC_FASTRR_SELLER_DOMAIN is empty. Fastrr is off.",
  "script-unavailable":
    "Fastrr is configured but window.HeadlessCheckout is missing — its script has not loaded. " +
    "NEXT_PUBLIC_* values are inlined at compile time, so if the variable was added while the dev server " +
    "was already running, restart it. Otherwise check for a blocked CDN or an ad blocker.",
  "api-not-configured":
    "FASTRR_API_KEY / FASTRR_SECRET_KEY are not set on the server, so no checkout token can be signed.",
  "token-request-failed":
    "Fastrr's access-token API failed or timed out. The server log has the response.",
  "empty-cart": "Cart is empty.",
  "zero-total": "Cart total is ₹0 — there is no payment for Fastrr to take.",
  "custom-artwork":
    "Cart contains a custom print and NEXT_PUBLIC_FASTRR_ALLOW_CUSTOM=false, so it uses Shopify's " +
    "checkout, where the artwork link is a native line property.",
  "unparseable-variant-id":
    "A cart line's variant id is not a Shopify GID ending in digits.",
  "open-threw": "HeadlessCheckout.addToCart() threw. Fell back to Shopify checkout.",
};

/**
 * Records the decision so it can be inspected.
 *
 * Logged in development, and always left on `window.__litwallsCheckout` — the
 * latter costs nothing and turns "checkout went to the wrong place" in
 * production into one line in a console rather than a bisect.
 */
function record(outcome: CheckoutOutcome): CheckoutOutcome {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__litwallsCheckout = outcome;
  }

  if (process.env.NODE_ENV === "development") {
    if (outcome.via === "fastrr") {
      console.info("[checkout] → Fastrr overlay");
    } else {
      const why = outcome.reason
        ? (REASONS[outcome.reason] ?? outcome.reason)
        : "Fastrr not attempted.";
      console.info(`[checkout] → Shopify (${outcome.reason ?? "default"})\n  ${why}`);
    }
  }

  return outcome;
}

/**
 * Which checkout this cart should use, as far as the browser can tell.
 *
 * A prediction, not a promise: the server makes the same eligibility check
 * again on the cart Shopify is actually holding, and still has to get a token.
 * It exists so the obvious cases skip a round trip, and so the cart drawer can
 * show the answer in development without committing to it.
 */
export function checkoutDecision(cart: Cart): CheckoutOutcome {
  if (!isFastrrConfigured()) return { via: "shopify", reason: "not-configured" };
  if (!isFastrrReady()) return { via: "shopify", reason: "script-unavailable" };

  const eligibility = fastrrEligibility(cart);
  if (!eligibility.eligible) {
    return { via: "shopify", reason: eligibility.reason };
  }

  return { via: "fastrr" };
}

function goToShopify(cart: Cart, reason?: string): CheckoutOutcome {
  // Logged first, navigated second — a console line written after
  // `window.location.href` is assigned is a console line nobody ever reads.
  const outcome = record({ via: "shopify", reason });
  window.location.href = withGaLinker(withClaimedDiscount(cart.checkoutUrl));
  return outcome;
}

export async function startCheckout(
  cart: Cart,
  {
    onClose,
  }: {
    /** Fired when the shopper closes the Fastrr overlay without paying. */
    onClose?: () => void;
  } = {},
): Promise<CheckoutOutcome> {
  // Fired for both destinations, before either. These are the same events at
  // the same moment as before — the funnel does not move because the checkout
  // did.
  trackMetaInitiateCheckout(cart);
  trackGaBeginCheckout(cart);

  const decision = checkoutDecision(cart);
  if (decision.via === "shopify") return goToShopify(cart, decision.reason);

  // A Server Action that fails at the network level rejects rather than
  // returning, and a shopper mid-purchase is the worst possible moment to
  // surface an error — so that too becomes the checkout they would have had.
  const checkout = await createFastrrCheckout(claimedDiscount()).catch(
    () => ({ ok: false, reason: "token-request-failed" }) as const,
  );

  if (!checkout.ok) return goToShopify(cart, checkout.reason);

  try {
    window.HeadlessCheckout!.addToCart(
      undefined,
      checkout.token,
      { fallbackUrl: withClaimedDiscount(cart.checkoutUrl) },
      (event) => {
        if (event?.exitCheckout) onClose?.();
      },
    );
  } catch {
    return goToShopify(cart, "open-threw");
  }

  // `addToCart` returns nothing and swallows its own failures, so a call that
  // "succeeded" may still have quietly bounced to our fallbackUrl — which is
  // Shopify, and therefore indistinguishable from us never having tried. Their
  // script injects #fastrr-main-container when the overlay actually opens, so
  // its absence a moment later is the tell. Dev only: this is a diagnostic,
  // not behaviour.
  if (process.env.NODE_ENV === "development") {
    setTimeout(() => {
      if (!document.getElementById("fastrr-main-container")) {
        console.warn(
          "[checkout] A token was issued but no Fastrr overlay opened.\n" +
            `  Check that Shiprocket holds this account against "${FASTRR_SELLER_DOMAIN}" ` +
            "(NEXT_PUBLIC_FASTRR_SELLER_DOMAIN) — it must match the domain they onboarded, " +
            "which is not necessarily your storefront hostname.",
        );
      }
    }, 2500);
  }

  return record({ via: "fastrr" });
}
