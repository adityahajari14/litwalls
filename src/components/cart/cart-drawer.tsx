"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

import {
  BagIcon,
  CheckIcon,
  CloseIcon,
  GiftIcon,
  LockIcon,
  ReturnIcon,
  TagIcon,
  TruckIcon,
} from "@/components/icons";
import { useCart } from "@/components/cart/cart-provider";
import { FreeShippingBar } from "@/components/cart/free-shipping-bar";
import { GiftMilestoneBar } from "@/components/cart/gift-milestone-bar";
import { ButtonLink } from "@/components/ui/button";
import { Overlay } from "@/components/ui/overlay";
import {
  checkoutDecision,
  startCheckout,
} from "@/lib/checkout/start-checkout";
import { cn } from "@/lib/cn";
import { REPLACEMENT_WINDOW_DAYS } from "@/lib/company";
import { deliveryEstimate } from "@/lib/marketing";
import { CUSTOM_ART_ATTRIBUTE } from "@/lib/custom-poster";
import { formatMoney } from "@/lib/money";
import {
  appliedBundle,
  bundleForQuantity,
  bundleFreeCount,
  bundleQuantities,
  FIRST_ORDER_CODE,
  FIRST_ORDER_DISCOUNT,
  FIRST_ORDER_MINIMUM,
  GIFT_ATTRIBUTE,
  GIFT_OPTIONS,
  MANAGED_DISCOUNT_CODES,
  nextBundle,
  SINGLE_BUNDLES,
  SPLIT_BUNDLES,
  type Bundle,
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

/** "Buy 4, get 3 free" — the same words the offer is advertised with. */
function bundleLabel(bundle: Bundle) {
  return `Buy ${bundle.pay}, get ${bundleFreeCount(bundle)} free`;
}

/**
 * "Add 3 more posters and get 3 free."
 *
 * Shown only while there is a rung left to reach. This is the one piece of
 * nudging in the cart that earns its place: it names an exact, small action
 * and what it is worth, rather than a generic "spend more to save".
 *
 * The distance is measured to the rung's full set, free posters included.
 * Shopify only applies a buy-X-get-Y once every one of those is in the cart —
 * it never adds the free ones itself — so "buy 4, get 3 free" needs seven
 * posters in the basket. The earlier version counted to the paid four and
 * promised "3 come free" at a point where nothing happened; a customer who
 * followed it saw no discount and reasonably concluded the offer was broken.
 * When reaching the rung would not raise what the customer pays — four
 * posters in the cart, three more to add, still paying for four — the copy
 * says the rest are on us, because they are.
 *
 * Says nothing for a ladder whose rung the cart has already reached but which
 * Shopify did not apply (a poster outside the discount's collections, say).
 * Whatever went wrong there, promising the next rung on top of it would only
 * compound it.
 *
 * Counted by `bundleQuantities`, the same function the server uses to choose
 * the codes, so what is promised here is what gets applied.
 *
 * Whichever ladder is closer to its next rung is the one worth naming; showing
 * both at once turns a single clear action into a decision.
 */
function BundleNudge({ cart }: { cart: Cart }) {
  const { singleQuantity, splitQuantity } = bundleQuantities(cart);

  const applied = appliedBundle(cart);

  const candidates = [
    { ladder: SINGLE_BUNDLES, have: singleQuantity, unit: "poster" },
    { ladder: SPLIT_BUNDLES, have: splitQuantity, unit: "split set" },
  ]
    .map((entry) => ({
      ...entry,
      bundle: nextBundle(entry.ladder, entry.have),
      // The rung this quantity should already be on, by our own count.
      reached: bundleForQuantity(entry.ladder, entry.have),
    }))
    // Only ladders the cart has actually started: telling someone with four
    // posters that one split set earns two free is an upsell, not a nudge.
    .filter((entry) => entry.bundle !== null && entry.have > 0)
    // And only where Shopify agrees with that count so far.
    .filter((entry) => entry.reached === null || applied !== null)
    .map((entry) => ({ ...entry, needed: entry.bundle!.total - entry.have }))
    .sort((a, b) => a.needed - b.needed);

  const target = candidates[0];
  if (!target) return null;

  const bundle = target.bundle!;
  const free = bundleFreeCount(bundle);
  const units = `${target.unit}${target.needed === 1 ? "" : "s"}`;
  // What is being paid for now, against what the next rung charges for. If
  // the next rung charges for no more, everything still to add is free.
  const paidNow =
    target.have - (target.reached ? bundleFreeCount(target.reached) : 0);
  const restAreFree = bundle.pay <= paidNow;

  return (
    <p className="flex items-start gap-2 rounded-card bg-brand-50 px-3 py-2.5 text-xs text-brand-800 text-pretty">
      <TagIcon className="mt-px size-3.5 shrink-0" />
      <span>
        {restAreFree ? (
          <>
            <span className="font-semibold">
              Add {target.needed} more {units} — on us.
            </span>{" "}
            {bundleLabel(bundle)} applies once all {bundle.total} are in your
            cart.
          </>
        ) : (
          <>
            <span className="font-semibold">
              Add {target.needed} more {units} and get {free} free.
            </span>{" "}
            {bundleLabel(bundle)}: put {bundle.total} in your cart, pay for{" "}
            {bundle.pay}.
          </>
        )}
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
    <div className="flex items-start gap-2 rounded-card bg-success/10 px-3 py-2.5 text-xs text-success">
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

function LineItem({ line, index }: { line: CartLine; index: number }) {
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

  // Shopify applies a buy-X-get-Y by splitting a line in two — the paid
  // posters and the free ones — so the free half arrives as its own line with
  // a full-price subtotal and a zero total. Unlabelled, that reads as a
  // duplicate row with a missing price.
  const isBundleFree =
    !isGift &&
    Number(line.cost.totalAmount.amount) === 0 &&
    Number(line.cost.subtotalAmount.amount) > 0;

  // A custom poster's thumbnail should be the customer's own artwork, not the
  // generic product photo — otherwise three custom lines look identical.
  const artwork = line.attributes.find(
    (attribute) => attribute.key === CUSTOM_ART_ATTRIBUTE,
  )?.value;

  return (
    <li
      style={{ "--i": Math.min(index, 6) } as React.CSSProperties}
      className={cn("transition-opacity duration-200", pending && "opacity-60")}
    >
      <div className="flex gap-4">
        <Link
          href={`/products/${product.handle}`}
          className="relative size-20 shrink-0 overflow-hidden rounded-card bg-ink-100"
        >
          {artwork ? (
            // A plain <img>: this is one customer's own upload, shown to
            // them alone, so there is nothing for next/image to cache. But
            // the file is print resolution — see artworkThumbnail.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artworkThumbnail(artwork)}
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
          ) : isBundleFree ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-success">
              <TagIcon className="size-3.5" />
              Free with your bundle
              <span className="font-normal text-ink-400 line-through">
                {formatMoney(line.merchandise.price)}
              </span>
            </p>
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

            <p
              className={cn(
                "text-sm font-semibold",
                isGift || isBundleFree ? "text-success" : "text-ink-950",
              )}
            >
              {isGift || isBundleFree
                ? "Free"
                : formatMoney(line.cost.totalAmount)}
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

  // Collapsed by default. A visible empty coupon box is a well-documented
  // conversion leak: it announces that a better price exists somewhere and
  // sends people off-site to hunt for it, and many do not come back. It is
  // also close to redundant here — the cart already applies every bundle code
  // itself and offers LIT100 with one tap. Someone holding a code will open
  // this; someone without one is never told to go looking.
  const [open, setOpen] = useState(applied.length > 0);

  if (!open) {
    return (
      <div className="mt-4 border-t border-ink-100 pt-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-ink-500 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-ink-900"
        >
          Have a discount code?
        </button>
      </div>
    );
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
          // 16px below `sm`: iOS Safari zooms the whole page into any field
          // set smaller than that, and doesn't zoom back out afterwards.
          className="h-10 min-w-0 flex-1 rounded-card border border-ink-200 bg-white px-3 text-base uppercase placeholder:normal-case placeholder:text-ink-400 focus:border-ink-400 focus:outline-none sm:text-sm"
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

/**
 * A cart-sized version of a customer's artwork.
 *
 * The line attribute points at the print file itself — up to 20MB — and the
 * drawer shows it 80 pixels wide. Shopify's CDN resizes on request, so asking
 * for a small one turns a multi-megabyte download per custom line into a few
 * kilobytes. Anything not on that CDN is left alone.
 */
function artworkThumbnail(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "cdn.shopify.com") return url;
    parsed.searchParams.set("width", "240");
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * A development-only readout of the Fastrr routing decision.
 *
 * "Checkout still goes to Shopify" is indistinguishable from the outside
 * whether the integration is misconfigured or working exactly as designed —
 * several carts are supposed to go to Shopify. This says which case it is.
 */
function FastrrDebug({ cart }: { cart: Cart }) {
  const decision = checkoutDecision(cart);
  const ok = decision.via === "fastrr";

  return (
    <p
      className={cn(
        "mt-3 rounded-card px-3 py-2 font-mono text-[11px] leading-relaxed",
        ok ? "bg-success/10 text-success" : "bg-ink-100 text-ink-600",
      )}
    >
      dev · checkout → {ok ? "Fastrr overlay" : `Shopify (${decision.reason})`}
    </p>
  );
}

/**
 * The cart, as a drawer.
 *
 * The shell — portal, backdrop, slide in and out, scroll lock, Escape, focus
 * trap — is <Overlay>, shared with the mobile menu and search so all three
 * arrive and leave the same way. The contents are their own component so they
 * only exist while the drawer is on screen, and so the "Redirecting…" state on
 * the checkout button resets every time it is reopened.
 */
export function CartDrawer() {
  const { isOpen, close } = useCart();

  return (
    <Overlay
      open={isOpen}
      onClose={close}
      label="Shopping cart"
      side="right"
      className="z-60"
      panelClassName="w-[min(28rem,92vw)] bg-paper shadow-lift"
    >
      <CartContents />
    </Overlay>
  );
}

function CartContents() {
  const { cart, close } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);

  const lines = cart?.lines.nodes ?? [];
  // Shopify's numbers, not a recomputation of them. cart.cost.subtotalAmount
  // is already net of a bundle discount, so the "Subtotal" line uses the
  // full-price sum instead — otherwise subtotal minus discount would not
  // equal the total actually charged.
  //
  // The free gift is left out of both figures. Shopify reports it as a ₹99
  // line with ₹99 off, which is accurate but reads as "Subtotal ₹993,
  // Discount −₹99" on a basket the customer chose ₹894 of — a discount they
  // never asked for on a subtotal they never built. The line itself already
  // says "Free".
  const giftValue = lines
    .filter(
      (line) =>
        line.attributes.some((attribute) => attribute.key === GIFT_ATTRIBUTE) &&
        Number(line.cost.totalAmount.amount) === 0,
    )
    .reduce((sum, line) => sum + Number(line.cost.subtotalAmount.amount), 0);
  const discount = cart ? Math.max(0, cartDiscountTotal(cart) - giftValue) : 0;
  const currency = cart?.cost.totalAmount.currencyCode ?? "INR";
  const undiscounted = cart ? cartUndiscountedTotal(cart) - giftValue : 0;
  const isEmpty = lines.length === 0;
  const hasGift = lines.some((line) =>
    line.attributes.some((attribute) => attribute.key === GIFT_ATTRIBUTE),
  );
  // What Shopify has actually applied, not what the basket size suggests.
  const bundle = cart ? appliedBundle(cart) : null;

  return (
    <>
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
          <span className="grid size-16 place-items-center rounded-full bg-ink-100 text-ink-400">
            <BagIcon className="size-7" />
          </span>
          <p className="text-ink-600">Your cart is empty.</p>
          <ButtonLink href="/products" onClick={close}>
            Browse posters
          </ButtonLink>
        </div>
      ) : (
        <>
          {/* One scrolling region for everything that isn't the total and the
              button. The progress bars, the offers and the coupon field used
              to be fixed above and below the list, which on a phone left the
              items themselves a strip about one line high to scroll in. */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* Above the items, not below: the customer decides whether to add
                another poster while they're still looking at the list. */}
            {cart ? (
              <div className="space-y-4 border-b border-ink-100 px-5 py-4">
                <FreeShippingBar subtotal={cart.cost.subtotalAmount} />
                {/* Hidden once the gift line itself is in the cart, and
                    hidden while a bundle is applied: Shopify allows only one
                    buy-X-get-Y per order, so a cart taking a bundle cannot
                    also take the gift, and counting down to one it will not
                    receive is a promise the checkout breaks. */}
                {hasGift || bundle ? null : (
                  <GiftMilestoneBar subtotal={cart.cost.subtotalAmount} />
                )}
                <BundleNudge cart={cart} />
              </div>
            ) : null}

            {/* Rows are keyed by line, so the stagger plays when the drawer
                opens and for a line that has just been added — not again on
                every quantity change. */}
            <ul className="stagger-in space-y-6 px-5 py-6">
              {lines.map((line, index) => (
                <LineItem key={line.id} line={line} index={index} />
              ))}
            </ul>

            {cart ? (
              <div className="px-5 pb-6">
                <DiscountSuggestion cart={cart} />
                <DiscountForm cart={cart} />

                {/* Development only: which checkout this cart will get, and
                    why. Visible without clicking, because the moment you click
                    is the moment the page navigates and takes the console with
                    it. Stripped from production builds by the NODE_ENV check. */}
                {process.env.NODE_ENV === "development" ? (
                  <FastrrDebug cart={cart} />
                ) : null}
              </div>
            ) : null}
          </div>

          <footer className="border-t border-ink-100 px-5 pt-4 pb-5 shadow-[0_-8px_24px_-16px_rgb(17_16_16/0.18)]">
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
                  {/* Named when it is the bundle, so the saving is tied to
                      the offer the customer was working toward. */}
                  {bundle ? bundleLabel(bundle) : "Discount"}
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

            {/* The arrival date was on the product page and nowhere else, so
                it disappeared at the exact moment the decision is made. */}
            <p className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-ink-500">
              {/* Prices in Shopify include tax, so the total above is what
                  the customer pays for the goods; only shipping can still
                  change it. */}
              <span>Taxes included. Shipping calculated at checkout.</span>
              <span className="flex items-center gap-1.5 text-ink-600">
                <TruckIcon className="size-4 shrink-0 text-brand-500" />
                Arrives{" "}
                <span className="font-semibold text-ink-950">
                  {deliveryEstimate().range}
                </span>
              </span>
            </p>

            <a
              href={cart?.checkoutUrl ?? "#"}
              onClick={async (event) => {
                if (!cart?.checkoutUrl) return;
                // Handled in JS, not by the href: which checkout a shopper
                // gets depends on what is in their cart, and on whether
                // Fastrr's script actually loaded. The href stays as the
                // Shopify URL so a middle-click or "open in new tab" still
                // does something sensible.
                event.preventDefault();
                // The Fastrr token takes a round trip, and a second tap in
                // that window would open a second checkout.
                if (checkingOut) return;
                setCheckingOut(true);

                const outcome = await startCheckout(cart);

                // Fastrr opens an overlay rather than navigating, so the
                // button has to come back out of its loading state — closing
                // the overlay must not leave a dead "Redirecting…" button.
                if (outcome.via === "fastrr") setCheckingOut(false);
              }}
              aria-disabled={!cart?.checkoutUrl}
              className="mt-4 flex h-13 w-full items-center justify-center rounded-full bg-brand-500 px-8 font-medium text-white transition duration-200 hover:bg-brand-600 active:scale-[0.98]"
            >
              {checkingOut ? "Redirecting…" : "Checkout"}
            </a>

            {/* The last thing seen before leaving for Shopify's domain.
                Naming the risks the customer is already weighing — is this
                safe, what if it's wrong — is what stops the tab from closing. */}
            <ul className="mt-3.5 flex items-center justify-center gap-5 text-xs text-ink-500">
              <li className="flex items-center gap-1.5">
                <LockIcon className="size-4 text-ink-400" />
                Secure checkout
              </li>
              <li className="flex items-center gap-1.5">
                <ReturnIcon className="size-4 text-ink-400" />
                {REPLACEMENT_WINDOW_DAYS}-day replacement
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
    </>
  );
}
