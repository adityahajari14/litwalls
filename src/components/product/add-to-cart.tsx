"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { trackAddToCart } from "@/lib/analytics/shopify";
import { addItem } from "@/lib/shopify/actions";
import { useCart } from "@/components/cart/cart-provider";
import type { Product, ProductVariant } from "@/lib/shopify/types";

export function AddToCart({
  product,
  variant,
  available,
  maxQuantity,
}: {
  product: Product;
  variant: ProductVariant | null;
  available: boolean;
  maxQuantity: number | null;
}) {
  const merchandiseId = variant?.id ?? null;
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [buying, setBuying] = useState(false);
  const { refresh, open } = useCart();
  const router = useRouter();

  if (!available || !merchandiseId) {
    return (
      <div className="space-y-3">
        <Button disabled variant="secondary" size="lg" className="w-full">
          Sold out
        </Button>
        <p className="text-sm text-ink-600">
          This poster is out of stock. Check back soon.
        </p>
      </div>
    );
  }

  const submit = (then: "drawer" | "checkout") => {
    setError(null);
    if (then === "checkout") setBuying(true);

    startTransition(async () => {
      const result = await addItem(merchandiseId, quantity);

      if (!result.ok) {
        setBuying(false);
        setError(result.message);
        return;
      }

      const cart = await refresh();

      // After refresh so the event carries Shopify's real cart id, and after
      // the ok check so a failed add is never counted. "Buy now" adds a line
      // too, so both paths report it.
      if (cart) trackAddToCart(cart, product, variant, quantity);

      if (then === "checkout") {
        if (cart?.checkoutUrl) {
          // Full navigation: checkout is hosted on Shopify's domain.
          window.location.href = cart.checkoutUrl;
          return;
        }
        setBuying(false);
        setError("Could not start checkout. Please try again.");
        return;
      }

      router.refresh();
      open();
    });
  };

  const busy = pending || buying;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          max={maxQuantity ?? undefined}
          disabled={busy}
        />
        <p className="text-sm text-ink-500">
          {maxQuantity !== null && maxQuantity <= 5
            ? `Only ${maxQuantity} left`
            : "In stock"}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          variant="secondary"
          className="flex-1"
          disabled={busy}
          onClick={() => submit("checkout")}
        >
          {buying ? "Starting checkout…" : "Buy now"}
        </Button>
        <Button
          size="lg"
          className="flex-1"
          disabled={busy}
          onClick={() => submit("drawer")}
        >
          {pending && !buying ? "Adding…" : "Add to cart"}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-brand-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
