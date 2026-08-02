"use client";

import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/**
 * Route-segment error boundary — wraps everything under the root layout, so
 * the header, footer and cart survive a page crash and a customer with items
 * in their cart never sees a blank screen.
 *
 * Doesn't cover the root layout itself (a crash in Header/Footer/CartProvider)
 * — that needs global-error.tsx, since this boundary sits inside the layout
 * it's meant to protect.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Server Components strip the real message before this reaches the
    // client — only the digest survives, which is what we'd hand support.
    console.error("Route error", error.digest ?? error.message, error);
  }, [error]);

  return (
    <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="font-display text-7xl text-brand-500">Oops</p>
      <h1 className="mt-4 font-display text-4xl text-ink-950">
        Something tore on the way here
      </h1>
      <p className="mt-3 max-w-md text-ink-600 text-pretty">
        That&apos;s on us, not your connection. Your cart is safe — try again,
        or head back to the posters.
      </p>

      {error.digest ? (
        <p className="mt-4 text-xs text-ink-400">Reference: {error.digest}</p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={() => unstable_retry()}>
          Try again
        </Button>
        <ButtonLink href="/products" variant="ghost" size="lg">
          Browse all posters
        </ButtonLink>
      </div>
    </Container>
  );
}
