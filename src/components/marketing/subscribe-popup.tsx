"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CheckIcon, CloseIcon, TagIcon } from "@/components/icons";
import { SubscribeForm } from "@/components/marketing/subscribe-form";
import { buttonClass } from "@/components/ui/button";
import {
  SUBSCRIBE_DISCOUNT_CODE,
  SUBSCRIBE_DISCOUNT_PERCENT,
} from "@/lib/marketing";

/**
 * localStorage, not sessionStorage: a dismissal is a decision about this
 * shop, not about this tab. Re-asking on every new tab is how a popup turns
 * from an offer into an annoyance, and annoyance costs more sessions than the
 * offer wins.
 */
const DISMISSED_KEY = "litwalls:subscribe-dismissed";
const SUBSCRIBED_KEY = "litwalls:subscribed";

/** Long enough that a dismissal sticks for the whole shopping trip and then some. */
const DISMISS_DAYS = 30;

/** A fallback, not the primary trigger — intent signals below usually fire first. */
const FALLBACK_DELAY_MS = 25_000;

/** Fraction of the page scrolled before we read the visit as engaged. */
const SCROLL_TRIGGER = 0.35;

function isSuppressed() {
  try {
    if (localStorage.getItem(SUBSCRIBED_KEY)) return true;

    const until = localStorage.getItem(DISMISSED_KEY);
    if (!until) return false;

    // A malformed value would make Number() NaN, and NaN > now is false, so a
    // corrupted entry fails open — we show the popup rather than silently
    // suppressing it forever.
    if (Number(until) > Date.now()) return true;

    localStorage.removeItem(DISMISSED_KEY);
    return false;
  } catch {
    // Safari private mode throws on localStorage. Don't take the popup down
    // over it, but don't loop on it either — the in-memory guard still holds
    // for this page view.
    return false;
  }
}

function suppress(key: string, days?: number) {
  try {
    localStorage.setItem(
      key,
      days === undefined ? "1" : String(Date.now() + days * 864e5),
    );
  } catch {
    // Ignore — see isSuppressed.
  }
}

export function SubscribePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [copied, setCopied] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  /** Guards against a second trigger racing the first — and against re-opening
      after a dismissal within the same page view, when storage is unavailable. */
  const settled = useRef(false);

  const openOnce = useCallback(() => {
    if (settled.current || isSuppressed()) return;
    settled.current = true;
    setIsOpen(true);
  }, []);

  /**
   * Show the offer when the visitor has demonstrated interest or is about to
   * leave — not on an arbitrary countdown. Whichever signal lands first wins:
   *
   *  - exit intent (pointer leaving toward the browser chrome) — desktop only,
   *    since there is no cursor to track on touch;
   *  - scroll depth, which is the honest mobile equivalent of exit intent;
   *  - a slow timer, so a visitor who reads one screenful and stops still sees it.
   */
  useEffect(() => {
    if (isSuppressed()) return;

    const onPointerOut = (event: MouseEvent) => {
      // relatedTarget is null when the pointer leaves the document entirely;
      // clientY <= 0 keeps it to an upward exit, not a drift out of the side.
      if (event.relatedTarget === null && event.clientY <= 0) openOnce();
    };

    const onScroll = () => {
      const scrollable = document.body.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      if (window.scrollY / scrollable >= SCROLL_TRIGGER) openOnce();
    };

    const timer = setTimeout(openOnce, FALLBACK_DELAY_MS);
    document.addEventListener("mouseout", onPointerOut);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseout", onPointerOut);
      window.removeEventListener("scroll", onScroll);
    };
  }, [openOnce]);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    suppress(DISMISSED_KEY, DISMISS_DAYS);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    // The offer is worthless if claiming it costs a click to focus the field.
    dialogRef.current?.querySelector("input")?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, dismiss]);

  function handleSubscribed() {
    setSubscribed(true);
    // Permanent: they've taken the offer, so it must never be pitched again.
    suppress(SUBSCRIBED_KEY);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(SUBSCRIBE_DISCOUNT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is permission-gated and blocked in some embedded webviews.
      // The code is on screen either way, so failing silently still leaves the
      // customer able to use it.
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 grid place-items-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={dismiss}
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscribe-popup-title"
        className="relative w-full max-w-sm rounded-2xl bg-paper p-8 text-center shadow-lift"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <CloseIcon className="size-5" />
        </button>

        {subscribed ? (
          <>
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-success/10 text-success">
              <CheckIcon className="size-6" />
            </div>

            <h2
              id="subscribe-popup-title"
              className="mt-4 font-display text-3xl text-ink-950"
            >
              You&apos;re in
            </h2>
            <p className="mt-2 text-sm text-ink-600 text-pretty">
              Your {SUBSCRIBE_DISCOUNT_PERCENT}% off is applied automatically at
              checkout. Here&apos;s the code, in case you want it later.
            </p>

            <button
              type="button"
              onClick={copyCode}
              className="mt-5 flex w-full items-center justify-between rounded-full border border-dashed border-ink-300 bg-white px-5 py-3 text-left transition-colors hover:border-brand-400"
            >
              <span className="font-display text-lg tracking-wide text-ink-950">
                {SUBSCRIBE_DISCOUNT_CODE}
              </span>
              <span className="text-xs font-medium text-brand-600">
                {copied ? "Copied" : "Tap to copy"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={buttonClass({ className: "mt-3 w-full" })}
            >
              Start shopping
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
              <TagIcon className="size-6" />
            </div>

            <h2
              id="subscribe-popup-title"
              className="mt-4 font-display text-4xl text-ink-950"
            >
              {SUBSCRIBE_DISCOUNT_PERCENT}% off your first wall
            </h2>
            <p className="mt-2 text-sm text-ink-600 text-pretty">
              Join the list for new drops and get {SUBSCRIBE_DISCOUNT_PERCENT}%
              off your first order. It applies itself at checkout.
            </p>

            <SubscribeForm
              id="subscribe-popup-email"
              className="mt-5"
              onSubscribed={handleSubscribed}
            />

            {/* The two objections that kill an email capture: "will you spam
                me" and "can I get out". Answering both beats another
                exclamation mark. */}
            <p className="mt-4 text-xs text-ink-400 text-pretty">
              One email a week at most. Unsubscribe in a click.
            </p>

            <button
              type="button"
              onClick={dismiss}
              className="mt-3 text-xs font-medium text-ink-400 underline underline-offset-4 transition-colors hover:text-ink-700"
            >
              No thanks, I&apos;ll pay full price
            </button>
          </>
        )}
      </div>
    </div>
  );
}
