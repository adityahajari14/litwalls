"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import {
  CheckIcon,
  CloseIcon,
  GiftIcon,
  LockIcon,
  ReturnIcon,
  TagIcon,
} from "@/components/icons";
import { useCart } from "@/components/cart/cart-provider";
import { FreeShippingBar } from "@/components/cart/free-shipping-bar";
import { GiftMilestoneBar } from "@/components/cart/gift-milestone-bar";
import { ButtonLink } from "@/components/ui/button";
import { withGaLinker } from "@/lib/analytics/ga-linker";
import { trackGaBeginCheckout } from "@/lib/analytics/google-analytics";
import { trackMetaInitiateCheckout } from "@/lib/analytics/meta-pixel";
import { withClaimedDiscount } from "@/lib/checkout-url";
import { CUSTOM_ART_ATTRIBUTE } from "@/lib/custom-poster";
import { formatMoney } from "@/lib/money";
import {
  bundleFreeCount,
  FIRST_ORDER_CODE,
  FIRST_ORDER_DISCOUNT,
  FIRST_ORDER_MINIMUM,
  GIFT_ATTRIBUTE,
  GIFT_OPTIONS,
  MANAGED_DISCOUNT_CODES,
  nextBundle,
  SINGLE_BUNDLES,
} from "@/lib/offers";
import {
  applyDiscount,
  removeDiscount,
  removeItem,
  setGiftPreference,
  updateItemQuantity,
} from "@/lib/shopify/actions";
import {
  cartDiscountTotal,
  cartUndiscountedTotal,
  type Cart,
  type CartLine,
} from "@/lib/shopify/types";

/**
 * "Add 1 more and 3 come free."
 *
 * Shown only while there is a rung left to reach. This is the one piece of
 * nudging in the cart that earns its place: it names an exact, small action
 * and what it is worth, rather than a generic "spend more to save".
 *
 * Counts every line, which slightly over-promises on a cart mixing split sets
 * with posters — the two ladders are counted separately server-side. Worth it
 * for a hint; the applied discount itself is always Shopify's number, never
 * this one.
 */
function BundleNudge({ cart }: { cart: Cart }) {
  const target = nextBundle(SINGLE_BUNDLES, cart.totalQuantity);
  if (!target) return null;

  const needed = target.pay - cart.totalQuantity;

  return (
    <p className="mt-3 flex items-start gap-2 rounded-card bg-brand-50 px-3 py-2.5 text-xs text-brand-800">
      <TagIcon className="mt-px size-3.5 shrink-0" />
      <span>
        Add {needed} more and {bundleFreeCount(target)} come free.
      </span>
    </p>
  );
}

/**
 * "You qualify for ₹100 off — Apply LIT100."
 *
 * Deliberately not auto-applied. The other two auto-applying offers (bundles,
 * the gift) each change what's physically in the cart — more posters, a gift
 * line — so applying them without asking is just completing an action the
 * customer's own basket already implies. LIT100 doesn't: it's a discount on
 * money already being spent, and silently taking ₹100 off a total the
 * customer was about to accept can read as the price being unstable, not as a
 * win. Surfacing it and asking for one tap keeps the customer in control of
 * when the total changes.
 *
 * Hidden once applied (the code appears in DiscountForm's applied list
 * instead) and hidden below the threshold — no point suggesting a discount
 * the cart doesn't yet qualify for.
 */
function DiscountSuggestion({ cart }: { cart: Cart }) {
  const { refresh } = useCart();
  const [pending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  const alreadyApplied = cart.discountCodes.some(
    (discount) => discount.code === FIRST_ORDER_CODE,
  );
  const qualifies =
    Number(cart.cost.subtotalAmount.amount) >= FIRST_ORDER_MINIMUM;

  if (alreadyApplied || !qualifies || dismissed) return null;

  return (
    <div className="mt-3 flex items-start gap-2 rounded-card bg-success/10 px-3 py-2.5 text-xs text-success">
      <TagIcon className="mt-px size-3.5 shrink-0" />
      <span className="flex-1">
        You qualify for ₹{FIRST_ORDER_DISCOUNT} off with{" "}
        <span className="font-semibold">{FIRST_ORDER_CODE}</span>.
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await applyDiscount(FIRST_ORDER_CODE);
            // A failed apply (code doesn't exist in Shopify yet, or was
            // already used) should stop the banner from offering it again
            // this session rather than nag on every render.
            if (!result.ok) setDismissed(true);
            await refresh();
          })
        }
        className="shrink-0 font-semibold underline decoration-success/40 underline-offset-2 hover:decoration-success disabled:opacity-50"
      >
        {pending ? "Applying…" : "Apply"}
      </button>
    </div>
  );
}

function LineItem({ line }: { line: CartLine }) {
  const { refresh } = useCart();
  const [pending, startTransition] = useTransition();

  const mutate = (run: () => Promise<unknown>) =>
    startTransition(async () => {
      await run();
      await refresh();
    });

  const { product } = line.merchandise;

  // Added by the cart, not chosen by the customer: it has no quantity to
  // adjust and removing it by hand would only bring it back on the next
  // change, so it renders as a fact rather than an editable line.
  const isGift = line.attributes.some(
    (attribute) => attribute.key === GIFT_ATTRIBUTE,
  );

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
          className="relative size-20 shrink-0 overflow-hidden rounded-card bg-ink-100"
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
            {isGift ? null : (
              <button
                type="button"
                onClick={() => mutate(() => removeItem(line.id))}
                disabled={pending}
                aria-label={`Remove ${product.title}`}
                className="shrink-0 text-ink-400 transition-colors hover:text-ink-900"
              >
                <CloseIcon className="size-4" />
              </button>
            )}
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

          {isGift ? (
            <>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-success">
                <GiftIcon className="size-3.5" />
                Free gift
                <span className="font-normal text-ink-400 line-through">
                  {formatMoney(line.merchandise.price)}
                </span>
              </p>

              {/* Lets the customer change their mind after the fact — the
                  active option is read off which product is actually in the
                  cart, not a stored preference, so it can never disagree with
                  what they're looking at. */}
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {GIFT_OPTIONS.map((option) => {
                  const active = product.handle === option.handle;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => mutate(() => setGiftPreference(option.id))}
                      disabled={pending || active}
                      aria-pressed={active}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors disabled:cursor-default ${
                        active
                          ? "border-ink-900 bg-ink-900 text-white"
                          : "border-ink-200 text-ink-600 hover:border-ink-400"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-600">
              {formatMoney(line.merchandise.price)}
            </p>
          )}

          {/* A custom poster is otherwise indistinguishable from a catalogue
              one here — same title, same price. The size and note are what the
              customer needs to see to know their order is right. The artwork
              URL is for fulfilment, not for them, so it stays hidden. */}
          {line.attributes.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {line.attributes
                .filter(
                  (attribute) =>
                    attribute.key !== CUSTOM_ART_ATTRIBUTE &&
                    attribute.key !== GIFT_ATTRIBUTE,
                )
                .map((attribute) => (
                  <li key={attribute.key} className="truncate text-xs text-ink-500">
                    {attribute.key}: {attribute.value}
                  </li>
                ))}
            </ul>
          ) : null}

          <div className="mt-2 flex items-center justify-between">
            {isGift ? (
              <span className="text-xs text-ink-500">Qty 1</span>
            ) : (
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
            )}

            <p className="text-sm font-semibold text-ink-950">
              {isGift ? "Free" : formatMoney(line.cost.totalAmount)}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Manual code entry, alongside the codes the cart applies for itself.
 *
 * Bundle codes are added automatically as the basket crosses a rung, but they
 * are ordinary Shopify codes, so someone who has one written down can still
 * type it. Codes this system manages are shown without a remove button — the
 * cart owns those, and removing one by hand would only have it reappear on the
 * next line change.
 */
function DiscountForm({ cart }: { cart: Cart }) {
  const { refresh } = useCart();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const managed = new Set(MANAGED_DISCOUNT_CODES);
  const applied = cart.discountCodes.filter((discount) => discount.applicable);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim() || pending) return;

    startTransition(async () => {
      const result = await applyDiscount(code);
      if (result.ok) {
        setCode("");
        setError(null);
      } else {
        setError(result.message);
      }
      await refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-ink-100 pt-4">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setError(null);
          }}
          placeholder="Discount code"
          aria-label="Discount code"
          autoComplete="off"
          autoCapitalize="characters"
          className="h-10 min-w-0 flex-1 rounded-card border border-ink-200 bg-white px-3 text-sm uppercase placeholder:normal-case placeholder:text-ink-400 focus:border-ink-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="h-10 shrink-0 rounded-card bg-ink-950 px-4 text-sm font-medium text-white transition-colors hover:bg-ink-800 disabled:opacity-40"
        >
          {pending ? "Applying…" : "Apply"}
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-brand-700">
          {error}
        </p>
      ) : null}

      {applied.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {applied.map((discount) => (
            <li
              key={discount.code}
              className="inline-flex items-center gap-1.5 rounded-full bg-success/10 py-1 pr-1 pl-2.5 text-xs font-medium text-success"
            >
              <CheckIcon className="size-3" />
              {discount.code}
              {managed.has(discount.code) ? (
                <span className="pr-1.5 text-success/70">auto</span>
              ) : (
                <button
                  type="button"
                  aria-label={`Remove ${discount.code}`}
                  onClick={() =>
                    startTransition(async () => {
                      await removeDiscount(discount.code);
                      await refresh();
                    })
                  }
                  className="grid size-4 place-items-center rounded-full text-success/70 transition-colors hover:bg-success/15 hover:text-success"
                >
                  <CloseIcon className="size-2.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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
  // Shopify's numbers, not a recomputation of them. cart.cost.subtotalAmount
  // is already net of a bundle discount, so the "Subtotal" line uses the
  // full-price sum instead — otherwise subtotal minus discount would not
  // equal the total actually charged.
  const discount = cart ? cartDiscountTotal(cart) : 0;
  const currency = cart?.cost.totalAmount.currencyCode ?? "INR";
  const undiscounted = cart ? cartUndiscountedTotal(cart) : 0;
  const isEmpty = lines.length === 0;
  const hasGift = lines.some((line) =>
    line.attributes.some((attribute) => attribute.key === GIFT_ATTRIBUTE),
  );

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
              <div className="space-y-4 border-b border-ink-100 px-5 py-4">
                <FreeShippingBar subtotal={cart.cost.subtotalAmount} />
                {/* Hidden once the gift line itself is in the cart — see
                    GiftMilestoneBar's own note on why this decision belongs
                    here rather than inside the bar. A bundle blocks the gift
                    (Shopify allows only one buy-X-get-Y per order), and the
                    absence of a gift line is what actually reflects that. */}
                {hasGift ? null : (
                  <GiftMilestoneBar subtotal={cart.cost.subtotalAmount} />
                )}
              </div>
            ) : null}

            <ul className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
              {lines.map((line) => (
                <LineItem key={line.id} line={line} />
              ))}
            </ul>

            <footer className="border-t border-ink-100 px-5 py-5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-ink-600">Subtotal</span>
                <span className="text-ink-900">
                  {cart
                    ? formatMoney({
                        amount: String(undiscounted),
                        currencyCode: currency,
                      })
                    : "—"}
                </span>
              </div>

              {/* Only rendered from what Shopify actually took off. A cart that
                  earned nothing shows no line, and a code that Shopify marked
                  inapplicable contributes zero — so this can never claim a
                  saving the checkout won't honour. */}
              {discount > 0 ? (
                <div className="mt-1.5 flex items-baseline justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-success">
                    <TagIcon className="size-3.5" />
                    Discount
                  </span>
                  <span className="font-medium text-success">
                    −
                    {formatMoney({
                      amount: String(discount),
                      currencyCode: currency,
                    })}
                  </span>
                </div>
              ) : null}

              <div className="mt-3 flex items-baseline justify-between border-t border-ink-100 pt-3">
                <span className="text-ink-600">Total</span>
                <span className="text-lg font-semibold text-ink-950">
                  {cart ? formatMoney(cart.cost.totalAmount) : "—"}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                Shipping and taxes calculated at checkout.
              </p>

              {cart ? <BundleNudge cart={cart} /> : null}
              {cart ? <DiscountSuggestion cart={cart} /> : null}
              {cart ? <DiscountForm cart={cart} /> : null}

              <a
                href={cart?.checkoutUrl ?? "#"}
                onClick={(event) => {
                  if (!cart?.checkoutUrl) return;
                  // Rewritten on click, not in render: withClaimedDiscount
                  // reads localStorage, which doesn't exist on the server.
                  event.preventDefault();
                  setCheckingOut(true);
                  trackMetaInitiateCheckout(cart);
                  trackGaBeginCheckout(cart);
                  window.location.href = withGaLinker(
                    withClaimedDiscount(cart.checkoutUrl),
                  );
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
