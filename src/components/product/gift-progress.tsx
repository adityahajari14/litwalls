"use client";

import { GiftIcon } from "@/components/icons";
import { useCart } from "@/components/cart/cart-provider";
import { amountToMilestone, milestoneProgress } from "@/lib/marketing";
import { formatMoney } from "@/lib/money";
import { appliedBundle, GIFT_DESCRIPTION, GIFT_THRESHOLD } from "@/lib/offers";

/**
 * "₹340 more and 5 prints come free" — on the product page, not just the cart.
 *
 * The gift is the cheapest lever the store has: five mini prints cost very
 * little and put the custom-print range physically in someone's hands. But it
 * was only ever surfaced as a progress bar inside the cart drawer, so a
 * shopper found out how close they were *after* they had already decided what
 * to buy. Here it lands while they are still choosing quantity.
 *
 * Renders nothing when the cart is empty (there is no progress to report and
 * the offer is already stated in the offers block above) or once the milestone
 * is passed — a bar reading "complete" is just noise at that point, and the
 * cart already shows the gift line itself.
 */
export function GiftProgress() {
  const { cart } = useCart();

  const subtotal = cart?.cost.subtotalAmount;
  if (!subtotal || subtotal.currencyCode !== "INR") return null;

  // A cart taking a bundle cannot also take the gift — Shopify applies one
  // buy-X-get-Y per order — so counting down to it here would be a promise
  // the checkout doesn't keep.
  if (cart && appliedBundle(cart)) return null;

  const amount = Number(subtotal.amount);
  if (amount <= 0) return null;

  const remaining = amountToMilestone(amount, GIFT_THRESHOLD);
  if (remaining === 0) return null;

  const progress = milestoneProgress(amount, GIFT_THRESHOLD);

  return (
    <div className="rounded-card border border-brand-200 bg-brand-50/60 p-4">
      <p className="flex items-start gap-2.5 text-sm text-ink-700 text-pretty">
        <GiftIcon className="mt-0.5 size-4 shrink-0 text-brand-600" />
        <span>
          <span className="font-semibold text-ink-950">
            {formatMoney({
              amount: String(remaining),
              currencyCode: subtotal.currencyCode,
            })}
          </span>{" "}
          more in your cart and {GIFT_DESCRIPTION} come free.
        </span>
      </p>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={GIFT_THRESHOLD}
        aria-valuenow={Math.min(amount, GIFT_THRESHOLD)}
        aria-label="Progress toward the free gift"
        className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white"
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-out-soft"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
