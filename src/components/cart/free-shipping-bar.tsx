import { TruckIcon } from "@/components/icons";
import {
  amountToFreeShipping,
  freeShippingProgress,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/marketing";
import { formatMoney } from "@/lib/money";
import type { Money } from "@/lib/shopify/types";

/**
 * "₹120 away from free shipping", driven by the real cart subtotal.
 *
 * The threshold is a real Shopify shipping rate and the gap is real
 * arithmetic, so this is a nudge, not a manufactured urgency — the customer
 * can act on it and the promise holds at checkout.
 *
 * Takes cart.cost.subtotalAmount deliberately: that figure is already net of
 * any bundle discount, and Shopify's own free-shipping rate is evaluated
 * against what the customer actually pays. Passing the full-price sum here
 * would promise free shipping the checkout then refuses.
 */
export function FreeShippingBar({ subtotal }: { subtotal: Money }) {
  // The threshold is set in rupees, so this only means anything for an INR
  // cart. Rather than compare across currencies, say nothing.
  if (subtotal.currencyCode !== "INR") return null;

  const amount = Number(subtotal.amount);
  const remaining = amountToFreeShipping(amount);
  const unlocked = remaining === 0;
  const progress = freeShippingProgress(amount);

  const remainingMoney = formatMoney({
    amount: String(remaining),
    currencyCode: subtotal.currencyCode,
  });
  return (
    <div>
      <p className="flex items-center gap-2 text-xs leading-relaxed text-ink-700">
        <TruckIcon
          className={`size-4 shrink-0 ${unlocked ? "text-success" : "text-brand-500"}`}
        />
        {unlocked ? (
          <span className="font-medium text-success">
            Free delivery unlocked
          </span>
        ) : (
          <span className="text-pretty">
            Add <span className="font-semibold text-ink-950">{remainingMoney}</span>{" "}
            more for free delivery.
          </span>
        )}
      </p>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={FREE_SHIPPING_THRESHOLD}
        aria-valuenow={Math.min(amount, FREE_SHIPPING_THRESHOLD)}
        aria-label="Progress toward free shipping"
        aria-valuetext={unlocked ? "Free delivery unlocked" : `${remainingMoney} away from free delivery`}
        className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-ink-100"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out-soft ${
            unlocked ? "bg-success" : "bg-brand-500"
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
