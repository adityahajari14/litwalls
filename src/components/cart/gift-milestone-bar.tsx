"use client";

import { useState, useSyncExternalStore, useTransition } from "react";

import { GiftIcon } from "@/components/icons";
import { useCart } from "@/components/cart/cart-provider";
import { amountToMilestone, milestoneProgress } from "@/lib/marketing";
import { formatMoney } from "@/lib/money";
import {
  DEFAULT_GIFT_OPTION,
  GIFT_CHOICE_COOKIE,
  GIFT_OPTIONS,
  GIFT_THRESHOLD,
} from "@/lib/offers";
import { setGiftPreference } from "@/lib/shopify/actions";
import type { Money } from "@/lib/shopify/types";

/** Reads the customer's saved pick straight off the cookie — see the comment
 *  on GIFT_CHOICE_COOKIE for why this doesn't go through the server. */
function readGiftChoice(): string {
  if (typeof document === "undefined") return DEFAULT_GIFT_OPTION;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${GIFT_CHOICE_COOKIE}=([^;]+)`),
  );
  const value = match?.[1];
  return GIFT_OPTIONS.some((option) => option.id === value)
    ? value!
    : DEFAULT_GIFT_OPTION;
}

/**
 * "₹340 away from a free gift", the same pattern as FreeShippingBar but for
 * the ₹799 milestone — plus which of the two gift products the customer wants,
 * since there's now a real choice to make (see GIFT_OPTIONS).
 *
 * Takes cart.cost.subtotalAmount, same as FreeShippingBar and for the same
 * reason: it is what the customer actually owes. Before the gift line exists
 * this equals their real spend; once it exists syncCartGift has already
 * zeroed it, so the figure never inflates itself with its own reward.
 *
 * A bundle blocks the gift (see bundleBlocksGift in offers.ts) — Shopify
 * allows only one buy-X-get-Y discount per order, and the bundle is worth
 * more. This bar has no way to know from the subtotal alone whether a bundle
 * is active, so it always shows progress toward the milestone; the cart drawer
 * only renders it when a gift line isn't already present, which is the
 * signal that actually reflects Shopify's decision.
 */
export function GiftMilestoneBar({ subtotal }: { subtotal: Money }) {
  const { refresh } = useCart();
  const [pending, startTransition] = useTransition();

  // Client-only read: the cookie's value isn't known at server-render time,
  // so the server snapshot is just the default — useSyncExternalStore (rather
  // than an effect + setState) is what lets that mismatch resolve on the
  // client's first paint without an extra render.
  const saved = useSyncExternalStore(
    () => () => {},
    readGiftChoice,
    () => DEFAULT_GIFT_OPTION,
  );
  // Overridden the instant someone taps a pill, so the button they clicked
  // highlights immediately rather than waiting on the server action + cookie
  // round trip to catch up.
  const [override, setOverride] = useState<string | null>(null);
  const choice = override ?? saved;

  if (subtotal.currencyCode !== "INR") return null;

  const amount = Number(subtotal.amount);
  const remaining = amountToMilestone(amount, GIFT_THRESHOLD);
  const unlocked = remaining === 0;
  const progress = milestoneProgress(amount, GIFT_THRESHOLD);

  if (unlocked) return null;

  const remainingMoney = formatMoney({
    amount: String(remaining),
    currencyCode: subtotal.currencyCode,
  });

  function choose(id: string) {
    setOverride(id);
    startTransition(async () => {
      await setGiftPreference(id);
      await refresh();
    });
  }

  return (
    <div>
      <p className="flex items-center gap-2 text-sm text-ink-700">
        <GiftIcon className="size-5 shrink-0 text-brand-500" />
        <span className="text-pretty">
          <span className="font-semibold text-ink-950">{remainingMoney}</span>{" "}
          away from a free gift.
        </span>
      </p>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={GIFT_THRESHOLD}
        aria-valuenow={Math.min(amount, GIFT_THRESHOLD)}
        aria-label="Progress toward the free gift"
        className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100"
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-out-soft"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-500">You&apos;ll get:</span>
        {GIFT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => choose(option.id)}
            disabled={pending}
            aria-pressed={choice === option.id}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
              choice === option.id
                ? "border-ink-900 bg-ink-900 text-white"
                : "border-ink-200 text-ink-700 hover:border-ink-400"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
