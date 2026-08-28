"use client";

import { useState, useTransition } from "react";

import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { rememberClaimedDiscount } from "@/lib/checkout-url";
import { SUBSCRIBE_DISCOUNT_CODE } from "@/lib/marketing";
import { subscribeToNewsletter } from "@/lib/shopify/actions";
import { cn } from "@/lib/cn";

/**
 * The newsletter capture, shared by the footer and the popup.
 *
 * Both surfaces make the same promise — the same discount, applied the same
 * way at checkout — so they must not be two implementations that can drift.
 * The popup owns its own dismissal/suppression logic; everything that happens
 * *after* the email is typed lives here.
 */
export function SubscribeForm({
  id,
  className,
  onSubscribed,
}: {
  /** Distinguishes the two instances' inputs when both are on the page. */
  id: string;
  className?: string;
  /** Lets the popup suppress itself once the offer has been taken. */
  onSubscribed?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("idle");

    startTransition(async () => {
      const result = await subscribeToNewsletter(email);

      if (!result.ok) {
        setStatus("error");
        setErrorMessage(result.message);
        return;
      }

      setStatus("success");
      // Makes good on "it applies itself at checkout" — see withClaimedDiscount.
      rememberClaimedDiscount();
      onSubscribed?.();
    });
  }

  if (status === "success") {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-card border border-success/30 bg-success/5 px-4 py-3",
          className,
        )}
      >
        <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
        <p className="text-sm text-ink-700 text-pretty">
          You&apos;re in. Your code{" "}
          <span className="font-medium text-ink-950">
            {SUBSCRIBE_DISCOUNT_CODE}
          </span>{" "}
          applies itself at checkout.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex gap-2">
        <input
          id={id}
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isPending}
          placeholder="you@email.com"
          aria-label="Email address"
          aria-invalid={status === "error"}
          className="h-11 w-full min-w-0 rounded-full border border-ink-200 bg-paper px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isPending}
          aria-label="Subscribe"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-950 text-white transition-colors hover:bg-brand-500 disabled:opacity-60"
        >
          <ArrowRightIcon
            className={cn("size-5", isPending && "animate-pulse")}
          />
        </button>
      </div>

      {status === "error" ? (
        <p role="alert" className="mt-2 text-sm text-brand-700">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
