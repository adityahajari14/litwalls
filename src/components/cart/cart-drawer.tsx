"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { CloseIcon, LockIcon, ReturnIcon } from "@/components/icons";
import { useCart } from "@/components/cart/cart-provider";
import { FreeShippingBar } from "@/components/cart/free-shipping-bar";
import { ButtonLink } from "@/components/ui/button";
import { trackMetaInitiateCheckout } from "@/lib/analytics/meta-pixel";
import { withClaimedDiscount } from "@/lib/checkout-url";
import { CUSTOM_ART_ATTRIBUTE } from "@/lib/custom-poster";
import { formatMoney } from "@/lib/money";
import { removeItem, updateItemQuantity } from "@/lib/shopify/actions";
import type { CartLine } from "@/lib/shopify/types";

function LineItem({ line }: { line: CartLine }) {
  const { refresh } = useCart();
  const [pending, startTransition] = useTransition();

  const mutate = (run: () => Promise<unknown>) =>
    startTransition(async () => {
      await run();
      await refresh();
    });

  const { product } = line.merchandise;

  // A custom poster's thumbnail should be the customer's own artwork, not the
  // generic product photo — otherwise three custom lines look identical.
  const artwork = line.attributes.find(
    (attribute) => attribute.key === CUSTOM_ART_ATTRIBUTE,
  )?.value;

  return (
    <li className={pending ? "opacity-60 transition-opacity" : undefined}>
      <div className="flex gap-4">
        <Link
          href={`/products/${product.handle}`}
          className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-ink-100"
        >
          {artwork ? (
            // Custom artwork sits on Shopify's staged-upload bucket, not the
            // product CDN, so next/image would reject the host — and there is
            // nothing to gain from optimising an image one person will see.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artwork}
              alt="Your artwork"
              className="size-full object-cover"
            />
          ) : product.featuredImage ? (
            <Image
              src={product.featuredImage.url}
              alt={product.featuredImage.altText ?? product.title}
              fill
              sizes="5rem"
              className="object-cover"
            />
          ) : null}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/products/${product.handle}`}
              className="line-clamp-2 text-sm font-medium text-ink-900 hover:text-brand-600"
            >
              {product.title}
            </Link>
            <button
              type="button"
              onClick={() => mutate(() => removeItem(line.id))}
              disabled={pending}
              aria-label={`Remove ${product.title}`}
              className="shrink-0 text-ink-400 transition-colors hover:text-ink-900"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>

          {/* The variant title IS the size for multi-size products. Without it
              two lines of the same poster in different sizes look identical
              apart from the price, which reads as a duplicate rather than a
              deliberate choice. "Default Title" is Shopify's placeholder for a
              product with no options, so it is never worth showing. */}
          {line.merchandise.title &&
          line.merchandise.title !== "Default Title" ? (
            <p className="mt-1 text-xs text-ink-500">
              {line.merchandise.title}
            </p>
          ) : null}

          <p className="mt-1 text-sm text-ink-600">
            {formatMoney(line.merchandise.price)}
          </p>

          {/* A custom poster is otherwise indistinguishable from a catalogue
              one here — same title, same price. The size and note are what the
              customer needs to see to know their order is right. The artwork
              URL is for fulfilment, not for them, so it stays hidden. */}
          {line.attributes.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {line.attributes
                .filter((attribute) => attribute.key !== CUSTOM_ART_ATTRIBUTE)
                .map((attribute) => (
                  <li key={attribute.key} className="truncate text-xs text-ink-500">
                    {attribute.key}: {attribute.value}
                  </li>
                ))}
            </ul>
          ) : null}

          <div className="mt-2 flex items-center justify-between">
            <div className="inline-flex items-center rounded-full border border-ink-200">
              <button
                type="button"
                className="grid size-8 place-items-center text-ink-700 transition-colors hover:text-ink-950 disabled:text-ink-300"
                onClick={() =>
                  mutate(() => updateItemQuantity(line.id, line.quantity - 1))
                }
                disabled={pending}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-medium">
                {line.quantity}
              </span>
              <button
                type="button"
                className="grid size-8 place-items-center text-ink-700 transition-colors hover:text-ink-950 disabled:text-ink-300"
                onClick={() =>
                  mutate(() => updateItemQuantity(line.id, line.quantity + 1))
                }
                disabled={pending}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <p className="text-sm font-semibold text-ink-950">
              {formatMoney(line.cost.totalAmount)}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

export function CartDrawer() {
  const { cart, isOpen, close } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const lines = cart?.lines.nodes ?? [];
  const isEmpty = lines.length === 0;

  return (
    <div className="fixed inset-0 z-60">
      <button
        type="button"
        aria-label="Close cart"
        onClick={close}
        className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
      />

      <aside
        role="dialog"
        aria-label="Shopping cart"
        className="absolute inset-y-0 right-0 flex w-[min(28rem,92vw)] flex-col bg-paper shadow-lift"
      >
        <header className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 className="font-display text-2xl text-ink-950">
            Your cart
            {cart && cart.totalQuantity > 0 ? (
              <span className="ml-2 text-base text-ink-500">
                ({cart.totalQuantity})
              </span>
            ) : null}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="grid size-10 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ink-100"
          >
            <CloseIcon className="size-5" />
          </button>
        </header>

        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-ink-600">Your cart is empty.</p>
            <ButtonLink href="/products" onClick={close}>
              Browse posters
            </ButtonLink>
          </div>
        ) : (
          <>
            {/* Above the items, not below: the customer decides whether to add
                another poster while they're still looking at the list. */}
            {cart ? (
              <div className="border-b border-ink-100 px-5 py-4">
                <FreeShippingBar subtotal={cart.cost.subtotalAmount} />
              </div>
            ) : null}

            <ul className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
              {lines.map((line) => (
                <LineItem key={line.id} line={line} />
              ))}
            </ul>

            <footer className="border-t border-ink-100 px-5 py-5">
              <div className="flex items-baseline justify-between">
                <span className="text-ink-600">Subtotal</span>
                <span className="text-lg font-semibold text-ink-950">
                  {cart ? formatMoney(cart.cost.subtotalAmount) : "—"}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                Shipping and taxes calculated at checkout.
              </p>

              <a
                href={cart?.checkoutUrl ?? "#"}
                onClick={(event) => {
                  if (!cart?.checkoutUrl) return;
                  // Rewritten on click, not in render: withClaimedDiscount
                  // reads localStorage, which doesn't exist on the server.
                  event.preventDefault();
                  setCheckingOut(true);
                  trackMetaInitiateCheckout(cart);
                  window.location.href = withClaimedDiscount(cart.checkoutUrl);
                }}
                aria-disabled={!cart?.checkoutUrl}
                className="mt-4 flex h-13 w-full items-center justify-center rounded-full bg-brand-500 px-8 font-medium text-white transition-colors hover:bg-brand-600"
              >
                {checkingOut ? "Redirecting…" : "Checkout"}
              </a>

              {/* The last thing seen before leaving for Shopify's domain.
                  Naming the risks the customer is already weighing — is this
                  safe, what if it's wrong — is what stops the tab from closing. */}
              <ul className="mt-4 flex items-center justify-center gap-5 text-xs text-ink-500">
                <li className="flex items-center gap-1.5">
                  <LockIcon className="size-4 text-ink-400" />
                  Secure checkout
                </li>
                <li className="flex items-center gap-1.5">
                  <ReturnIcon className="size-4 text-ink-400" />
                  7-day replacement
                </li>
              </ul>

              <button
                type="button"
                onClick={close}
                className="mt-3 w-full text-center text-xs font-medium text-ink-400 transition-colors hover:text-ink-700"
              >
                Continue shopping
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
