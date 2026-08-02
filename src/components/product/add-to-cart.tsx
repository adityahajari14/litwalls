"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { trackAddToCart } from "@/lib/analytics/shopify";
import { trackMetaAddToCart, trackMetaInitiateCheckout } from "@/lib/analytics/meta-pixel";
import { withClaimedDiscount } from "@/lib/checkout-url";
import { LOW_STOCK_THRESHOLD } from "@/lib/marketing";
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

  // Drives the sticky mobile bar: it appears only once the real buttons have
  // scrolled away, so the two are never on screen competing with each other.
  const [showSticky, setShowSticky] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = actionsRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      // Fire as the buttons clear the top of the viewport, not the moment a
      // single pixel of them leaves the bottom — otherwise the bar flashes in
      // while the buttons are still perfectly usable.
      { rootMargin: "-72px 0px 0px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [available, merchandiseId]);

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
      if (cart) {
        trackAddToCart(cart, product, variant, quantity);
        trackMetaAddToCart(product, variant, quantity);
      }

      if (then === "checkout") {
        if (cart?.checkoutUrl) {
          if (cart) trackMetaInitiateCheckout(cart);
          // Full navigation: checkout is hosted on Shopify's domain.
          window.location.href = withClaimedDiscount(cart.checkoutUrl);
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

  // Only claim scarcity when Shopify actually told us the number. A null count
  // means the token lacks the inventory scope — say nothing rather than invent
  // pressure.
  const lowStock =
    maxQuantity !== null && maxQuantity > 0 && maxQuantity <= LOW_STOCK_THRESHOLD;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <QuantityStepper
            value={quantity}
            onChange={setQuantity}
            max={maxQuantity ?? undefined}
            disabled={busy}
          />
          {lowStock ? (
            <p className="flex items-center gap-1.5 text-sm font-medium text-brand-600">
              <span className="size-1.5 animate-pulse rounded-full bg-brand-500" />
              Only {maxQuantity} left
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-ink-600">
              <span className="size-1.5 rounded-full bg-success" />
              In stock
            </p>
          )}
        </div>

        <div ref={actionsRef} className="flex flex-col gap-3 sm:flex-row">
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

      {/* On a phone the buy button is a screen or two above the fold by the
          time anyone has read the description — this keeps it one thumb-reach
          away for the whole page. */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-paper/95 backdrop-blur-md transition-transform duration-300 ease-out-soft sm:hidden ${
          showSticky ? "translate-y-0" : "translate-y-full"
        }`}
        // Hidden from assistive tech and keyboard when off-screen: the real
        // buttons are still in the page, and a duplicate would be a trap.
        aria-hidden={!showSticky}
        inert={!showSticky}
      >
        <div className="flex items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-ink-600">{product.title}</p>
            <Price
              price={variant?.price ?? product.priceRange.minVariantPrice}
              compareAt={variant?.compareAtPrice}
              showDiscount={false}
              className="mt-0.5"
            />
          </div>
          <Button
            size="lg"
            className="shrink-0 px-7"
            disabled={busy}
            onClick={() => submit("drawer")}
          >
            {pending && !buying ? "Adding…" : "Add to cart"}
          </Button>
        </div>
      </div>
    </>
  );
}
