/**
 * Marketing and conversion knobs, kept in one place so the numbers the site
 * promises can never drift apart from each other.
 *
 * Anything in here that is *asserted to the customer* — the shipping
 * threshold, the discount code, the dispatch cutoff — must match what Shopify
 * actually does. A progress bar that promises free shipping at ₹499 when the
 * shipping profile says ₹599 is worse than no progress bar at all.
 */

/**
 * Re-exported from offers.ts, which is now the single source of truth for
 * every rupee figure the site promises. Defining it in two files is how the
 * cart's progress bar and the announcement bar end up quoting different
 * thresholds — so this one only forwards.
 */
export { FREE_SHIPPING_THRESHOLD } from "@/lib/offers";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/offers";

/** Must match a real, active discount code in Shopify Discounts. */
export const SUBSCRIBE_DISCOUNT_CODE = "SUBSCRIBE10";
export const SUBSCRIBE_DISCOUNT_PERCENT = 10;

/**
 * Business days from dispatch to delivery. Shown as a date range on the
 * product page — a concrete date converts better than "3–5 days" because the
 * customer doesn't have to do the arithmetic to know if it beats their
 * deadline.
 */
export const DELIVERY_MIN_DAYS = 3;
export const DELIVERY_MAX_DAYS = 6;

/** Orders placed before this hour (IST, 24h) are dispatched the same day. */
export const SAME_DAY_DISPATCH_CUTOFF_HOUR = 16;

/**
 * Below this, the product page says "Only N left" instead of "In stock".
 * Driven by real Shopify inventory — see getVariantQuantityAvailable. When the
 * store's Storefront token lacks the inventory scope the count is null and no
 * scarcity claim is made at all.
 */
export const LOW_STOCK_THRESHOLD = 5;

export function amountToFreeShipping(subtotal: number) {
  return amountToMilestone(subtotal, FREE_SHIPPING_THRESHOLD);
}

export function freeShippingProgress(subtotal: number) {
  return milestoneProgress(subtotal, FREE_SHIPPING_THRESHOLD);
}

/**
 * How far a subtotal is from any rupee milestone — free shipping, the gift,
 * or whatever else gets measured this way. Shared so "₹120 away" always means
 * the same arithmetic regardless of which threshold it's measured against.
 */
export function amountToMilestone(subtotal: number, threshold: number) {
  return Math.max(0, threshold - subtotal);
}

export function milestoneProgress(subtotal: number, threshold: number) {
  return Math.min(1, Math.max(0, subtotal / threshold));
}

/**
 * Adds business days to a date, skipping weekends. Couriers don't move on
 * Sunday, so a naive +3 days quietly over-promises on a Friday order.
 */
function addBusinessDays(from: Date, days: number) {
  const date = new Date(from);
  let remaining = days;

  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }

  return date;
}

/**
 * The estimated delivery window, as a formatted range like "18–21 Jul".
 *
 * Computed on the server at render time. The product page is statically
 * generated and revalidated every 10 minutes (CATALOGUE_REVALIDATE), so the
 * dates stay current without making the page dynamic. Off by a day at worst,
 * on the boundary of a revalidation — acceptable for an estimate we label as
 * an estimate.
 */
export function deliveryEstimate(now = new Date()) {
  // Orders after the cutoff miss today's dispatch, so the clock starts tomorrow.
  const dispatchOffset = now.getHours() >= SAME_DAY_DISPATCH_CUTOFF_HOUR ? 1 : 0;

  const earliest = addBusinessDays(now, DELIVERY_MIN_DAYS + dispatchOffset);
  const latest = addBusinessDays(now, DELIVERY_MAX_DAYS + dispatchOffset);

  const day = new Intl.DateTimeFormat("en-IN", { day: "numeric" });
  const dayMonth = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  });

  const sameMonth = earliest.getMonth() === latest.getMonth();

  return {
    range: sameMonth
      ? `${day.format(earliest)}–${dayMonth.format(latest)}`
      : `${dayMonth.format(earliest)} – ${dayMonth.format(latest)}`,
    dispatchesToday: dispatchOffset === 0,
  };
}
