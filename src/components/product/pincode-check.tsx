"use client";

import { useState, useSyncExternalStore } from "react";

import { CheckIcon, TruckIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

type Result =
  | { state: "serviceable"; range: string; courier: string | null; cod: boolean | null }
  | { state: "unserviceable" }
  | { state: "error"; message: string };

/** Remembered so a returning shopper isn't asked for their PIN on every page. */
const PINCODE_KEY = "litwalls:pincode";

/**
 * The PIN this browser last checked, if any.
 *
 * `useSyncExternalStore` rather than an effect that sets state on mount: the
 * value does not exist during SSR, and this hook's server/client snapshot
 * split is exactly what resolves that — on the client's first paint, without
 * the second render pass a setState-in-effect would cost. The same pattern the
 * gift milestone bar already uses to read its cookie.
 *
 * The saved PIN prefills the field but does not fire a lookup on its own. An
 * automatic check would put a Shiprocket request on every product page view
 * for the sake of information the shopper can get with one tap.
 */
function readSavedPincode() {
  try {
    return localStorage.getItem(PINCODE_KEY) ?? "";
  } catch {
    // Private mode throws on access. An empty field is the same as a first
    // visit, which is a perfectly good state to be in.
    return "";
  }
}

/**
 * "Deliver to 560001?" — the interaction every Indian shopper expects.
 *
 * The national date range above this is honest but unverifiable from the
 * shopper's side; typing a PIN and getting their own date back is what turns
 * it from a claim into a promise. Backed by Shiprocket's real courier
 * serviceability, and it falls back to the national range rather than an
 * error when that is unavailable — see /api/serviceability.
 *
 * The PIN is kept in localStorage, not a cookie: it is a convenience for this
 * browser, it never needs to reach the server on its own, and remembering it
 * means the second product page answers the question before it is asked.
 */
export function PincodeCheck() {
  const saved = useSyncExternalStore(
    () => () => {},
    readSavedPincode,
    () => "",
  );

  // Null until the shopper types, so the field can show their remembered PIN
  // without that value becoming a second piece of state to keep in sync.
  const [typed, setTyped] = useState<string | null>(null);
  const pincode = typed ?? saved;

  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function check(value: string) {
    if (!/^[1-9][0-9]{5}$/.test(value)) {
      setResult({ state: "error", message: "Enter a valid 6-digit PIN code." });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `/api/serviceability?pincode=${encodeURIComponent(value)}`,
      );
      const data = await response.json();

      if (!data.ok) {
        setResult({
          state: "error",
          message: data.message ?? "Couldn't check that PIN code.",
        });
        return;
      }

      if (!data.serviceable) {
        setResult({ state: "unserviceable" });
        return;
      }

      try {
        localStorage.setItem(PINCODE_KEY, value);
      } catch {
        // See above — a remembered PIN is a nicety, not a requirement.
      }

      setResult({
        state: "serviceable",
        range: data.range,
        courier: data.courier,
        cod: data.cod,
      });
    } catch {
      setResult({
        state: "error",
        message: "Couldn't reach our courier just now. Try again in a moment.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-card border border-ink-200 bg-white p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void check(pincode.trim());
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <label
          htmlFor="pincode"
          className="flex items-center gap-2 text-sm font-medium text-ink-900"
        >
          <TruckIcon className="size-5 shrink-0 text-brand-500" />
          Deliver to
        </label>
        <input
          id="pincode"
          name="pincode"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          value={pincode}
          onChange={(event) => {
            setTyped(event.target.value.replace(/\D/g, ""));
            setResult(null);
          }}
          placeholder="PIN code"
          className="h-10 w-28 rounded-card border border-ink-200 bg-white px-3 text-sm text-ink-900 tabular-nums placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || pincode.length !== 6}
          className="h-10 shrink-0 rounded-card px-3 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 disabled:pointer-events-none disabled:text-ink-300"
        >
          {loading ? "Checking…" : "Check"}
        </button>
      </form>

      {result ? (
        <p
          aria-live="polite"
          className={cn(
            "mt-3 flex items-start gap-2 text-sm text-pretty",
            result.state === "serviceable" ? "text-ink-700" : "text-ink-600",
          )}
        >
          {result.state === "serviceable" ? (
            <>
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
              <span>
                Delivered by{" "}
                <span className="font-semibold text-ink-950">
                  {result.range}
                </span>
                {result.courier ? (
                  <span className="text-ink-500"> · via {result.courier}</span>
                ) : null}
                {result.cod ? (
                  <span className="text-ink-500"> · Cash on delivery available</span>
                ) : null}
              </span>
            </>
          ) : result.state === "unserviceable" ? (
            <span>
              We can&apos;t deliver to that PIN code yet. Email{" "}
              <a
                href="mailto:hello@litwalls.in"
                className="font-medium text-brand-600 underline underline-offset-4"
              >
                hello@litwalls.in
              </a>{" "}
              and we&apos;ll see what we can do.
            </span>
          ) : (
            <span>{result.message}</span>
          )}
        </p>
      ) : null}
    </div>
  );
}
