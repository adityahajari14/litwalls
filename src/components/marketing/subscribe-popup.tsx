"use client";

import { useEffect, useState, useTransition } from "react";

import { CloseIcon, TagIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import { subscribeToNewsletter } from "@/lib/shopify/actions";

const DISCOUNT_CODE = "SUBSCRIBE10";
const SHOW_AFTER_MS = 10_000;
const DISMISSED_KEY = "subscribe-popup-dismissed";

export function SubscribePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    const timer = setTimeout(() => setIsOpen(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  function dismiss() {
    setIsOpen(false);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await subscribeToNewsletter(email);
      if (result.ok) {
        setStatus("success");
        sessionStorage.setItem(DISMISSED_KEY, "1");
      } else {
        setStatus("error");
        setErrorMessage(result.message);
      }
    });
  }

  async function copyCode() {
    await navigator.clipboard.writeText(DISCOUNT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 grid place-items-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={dismiss}
        className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-label="Subscribe for a discount"
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

        <div className="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
          <TagIcon className="size-6" />
        </div>

        {status === "success" ? (
          <>
            <h2 className="mt-4 font-display text-2xl text-ink-950">
              You&apos;re in!
            </h2>
            <p className="mt-2 text-sm text-ink-600 text-pretty">
              Use this code at checkout for 10% off your first order.
            </p>

            <button
              type="button"
              onClick={copyCode}
              className="mt-5 flex w-full items-center justify-between rounded-full border border-dashed border-ink-300 bg-white px-5 py-3 text-left transition-colors hover:border-brand-400"
            >
              <span className="font-display text-lg tracking-wide text-ink-950">
                {DISCOUNT_CODE}
              </span>
              <span className="text-xs font-medium text-brand-600">
                {copied ? "Copied!" : "Tap to copy"}
              </span>
            </button>
          </>
        ) : (
          <>
            <h2 className="mt-4 font-display text-2xl text-ink-950">
              Get 10% off
            </h2>
            <p className="mt-2 text-sm text-ink-600 text-pretty">
              Subscribe for style drops and offers — get 10% off your first
              order.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@email.com"
                aria-label="Email address"
                className="h-12 w-full rounded-full border border-ink-200 bg-white px-5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isPending}
                className={buttonClass({ className: "w-full" })}
              >
                {isPending ? "Subscribing…" : "Get my code"}
              </button>
            </form>

            {status === "error" ? (
              <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
            ) : null}

            <button
              type="button"
              onClick={dismiss}
              className="mt-4 text-xs font-medium text-ink-400 transition-colors hover:text-ink-700"
            >
              No thanks
            </button>
          </>
        )}
      </div>
    </div>
  );
}
