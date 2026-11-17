"use client";

import { useState, useSyncExternalStore, useTransition } from "react";

import { ChevronDownIcon, GiftIcon } from "@/components/icons";
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
import styles from "./cart-drawer.module.css";

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
 * An always-visible gift target above the cart items, with
 * the amount still needed and the customer's choice of print format.
 *
 * Takes cart.cost.subtotalAmount, same as FreeShippingBar and for the same
 * reason: it is what the customer actually owes. Before the gift line exists
 * this equals their real spend; once it exists syncCartGift has already
 * zeroed it, so the figure never inflates itself with its own reward.
 *
 * Keep the spend target visible when it is reached or a bundle is applied.
 * Reaching the target alone is not confirmation of a free gift: the cart
 * passes Shopify's actual bundle and gift states so the copy stays accurate.
 */
export function GiftMilestoneBar({ subtotal, bundleApplied = false, giftAdded = false }: {
  subtotal: Money;
  bundleApplied?: boolean;
  giftAdded?: boolean;
}) {
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
  const targetReached = remaining === 0;

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
    <section className={styles.rewardCard} aria-label="Free gift target" data-state={giftAdded ? "added" : bundleApplied ? "bundle" : targetReached ? "reached" : "progress"}>
      <div className={styles.rewardHeading}>
        <h3><GiftIcon className="size-4" aria-hidden="true" />5 free photo prints</h3>
        <span className={styles.rewardCount}>{formatMoney(subtotal)} / {formatMoney({ amount: String(GIFT_THRESHOLD), currencyCode: subtotal.currencyCode })}</span>
      </div>
      <p className={styles.rewardDescription}>
        {giftAdded ? <strong>Free gift added to your cart.</strong> : targetReached ? <><strong>Spend target reached.</strong>{!bundleApplied ? " Your gift has not been added yet." : null}</> : <><strong>Add {remainingMoney} more</strong>{bundleApplied ? " to reach the spend target." : " to unlock your gift."}</>}
      </p>
      {bundleApplied && !giftAdded ? <p className={styles.rewardNotice}>Gift offer doesn&apos;t combine with the current bundle discount.</p> : null}
      <div role="progressbar" aria-label="Progress toward the free gift" aria-valuemin={0} aria-valuemax={GIFT_THRESHOLD} aria-valuenow={Math.min(amount, GIFT_THRESHOLD)} aria-valuetext={giftAdded ? "Free gift added to your cart" : bundleApplied ? `${targetReached ? "Spend target reached" : `${remainingMoney} away from the spend target`}. Gift offer doesn't combine with the current bundle discount.` : targetReached ? "Spend target reached; gift not yet added" : `${remainingMoney} away from 5 free photo prints`} className={styles.rewardTrack}>
        <span style={{ width: `${milestoneProgress(amount, GIFT_THRESHOLD) * 100}%` }} />
      </div>
      {!bundleApplied && !giftAdded ? <details className={styles.rewardChoice}>
        <summary><span>{GIFT_OPTIONS.find((option) => option.id === choice)?.label}</span><span>Change <ChevronDownIcon className="size-3" aria-hidden="true" /></span></summary>
        <div className={styles.giftChoices}>
        {GIFT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => choose(option.id)}
            disabled={pending}
            aria-pressed={choice === option.id}
          >
            {option.label}
          </button>
        ))}
        </div>
      </details> : null}
    </section>
  );
}
