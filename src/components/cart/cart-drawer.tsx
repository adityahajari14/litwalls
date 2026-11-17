"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState, useTransition } from "react";

import {
  BagIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  GiftIcon,
  LockIcon,
  TagIcon,
  TruckIcon,
} from "@/components/icons";
import { useCart } from "@/components/cart/cart-provider";
import { FreeShippingBar } from "@/components/cart/free-shipping-bar";
import { GiftMilestoneBar } from "@/components/cart/gift-milestone-bar";
import { ButtonLink } from "@/components/ui/button";
import { Overlay } from "@/components/ui/overlay";
import { startCheckout } from "@/lib/checkout/start-checkout";
import { cn } from "@/lib/cn";
import { REPLACEMENT_WINDOW_DAYS } from "@/lib/company";
import { amountToFreeShipping, deliveryEstimate } from "@/lib/marketing";
import { CUSTOM_ART_ATTRIBUTE, CUSTOM_CROP_ATTRIBUTE } from "@/lib/custom-poster";
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
  type CartActionResult,
} from "@/lib/shopify/actions";
import {
  cartDiscountTotal,
  cartUndiscountedTotal,
  type Cart,
  type CartLine,
} from "@/lib/shopify/types";
import styles from "./cart-drawer.module.css";

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
    <section className={styles.rewardCard} aria-label="Bundle offer target">
      <div className={styles.rewardHeading}>
        <h3><TagIcon className="size-4" aria-hidden="true" />{bundleLabel(bundle)}</h3>
        <span className={styles.rewardCount}>{target.have} / {bundle.total} {target.unit === "split set" ? "sets" : "posters"}</span>
      </div>
      <p className={styles.rewardDescription}>
        <strong>Add {target.needed} more {units}</strong>{restAreFree ? " — on us." : ` to unlock ${free} free.`}
      </p>
      <div role="progressbar" aria-label={`Progress toward ${target.unit} bundle`} aria-valuemin={0} aria-valuemax={bundle.total} aria-valuenow={Math.min(target.have, bundle.total)} aria-valuetext={`${target.have} of ${bundle.total} ${target.unit}s. Add ${target.needed} more; pay for ${bundle.pay} in total.`} className={styles.rewardTrack}>
        <span style={{ width: `${Math.min(100, Math.max(0, target.have / bundle.total * 100))}%` }} />
      </div>
    </section>
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
    <div className={styles.discountSuggestion}>
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
        className={styles.offerApply}
      >
        {pending ? "Applying…" : "Apply"}
      </button>
    </div>
  );
}

function LineItem({ line, index }: { line: CartLine; index: number }) {
  const { refresh } = useCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const mutate = (run: () => Promise<CartActionResult>) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await run();
        if (!result.ok) setError(result.message);
        await refresh();
      } catch {
        setError("We couldn't update this item. Please try again.");
      }
    });
  };

  const { product } = line.merchandise;
  const title = product.title.split("|")[0].trim();
  const isGift = line.attributes.some((attribute) => attribute.key === GIFT_ATTRIBUTE);
  const isBundleFree = !isGift && Number(line.cost.totalAmount.amount) === 0 && Number(line.cost.subtotalAmount.amount) > 0;
  const artwork = line.attributes.find((attribute) => attribute.key === CUSTOM_ART_ATTRIBUTE)?.value;
  const details = line.attributes.filter((attribute) =>
    attribute.key !== CUSTOM_ART_ATTRIBUTE && attribute.key !== CUSTOM_CROP_ATTRIBUTE && !attribute.key.startsWith("_"),
  );
  const variant = line.merchandise.title !== "Default Title" ? line.merchandise.title : null;

  return (
    <li className={cn(styles.line, pending && styles.pending)} style={{ "--i": Math.min(index, 6) } as React.CSSProperties} aria-busy={pending}>
      <Link href={`/products/${product.handle}`} className={styles.thumbnail} aria-label={`View ${title}`}>
        {artwork ? (
          // Customer artwork is already resized by artworkThumbnail.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artworkThumbnail(artwork)} alt="Your artwork" className="size-full object-cover" />
        ) : product.featuredImage ? (
          <Image src={product.featuredImage.url} alt={product.featuredImage.altText ?? product.title} fill sizes="80px" className="object-cover" />
        ) : <BagIcon className="size-6 text-ink-400" aria-hidden="true" />}
      </Link>
      <div className={styles.itemContent}>
        <div className={styles.itemHeading}>
          <Link href={`/products/${product.handle}`} className={styles.itemTitle}>{title}</Link>
          {!isGift ? <button type="button" onClick={() => mutate(() => removeItem(line.id))} disabled={pending} aria-label={`Remove ${product.title}`} className={styles.remove}><CloseIcon className="size-4" aria-hidden="true" /></button> : null}
        </div>
        {variant ? <p className={styles.variant}>{variant}</p> : null}
        {isGift || isBundleFree ? (
          <p className={styles.freeLabel}>{isGift ? <GiftIcon className="size-3.5" aria-hidden="true" /> : <TagIcon className="size-3.5" aria-hidden="true" />}{isGift ? "Your free gift" : "Free with your bundle"}</p>
        ) : line.quantity > 1 ? <p className={styles.unitPrice}>{formatMoney(line.merchandise.price)} each</p> : null}
        {details.length > 0 ? (
          <details className={styles.personalisation}>
            <summary>Personalisation details <ChevronDownIcon className="size-3" aria-hidden="true" /></summary>
            <ul>{details.map((attribute) => <li key={attribute.key}><span>{attribute.key}:</span> {attribute.value}</li>)}</ul>
          </details>
        ) : null}
        <div className={styles.itemBottom}>
          {isGift ? <span className={styles.variant}>Qty 1</span> : (
            <div className={styles.quantity} role="group" aria-label={`Quantity for ${product.title}`}>
              <button type="button" onClick={() => mutate(() => updateItemQuantity(line.id, line.quantity - 1))} disabled={pending} aria-label="Decrease quantity">−</button>
              <span aria-live="polite" aria-atomic="true">{line.quantity}</span>
              <button type="button" onClick={() => mutate(() => updateItemQuantity(line.id, line.quantity + 1))} disabled={pending} aria-label="Increase quantity">+</button>
            </div>
          )}
          <div className={styles.itemPrice}>
            {isGift || isBundleFree ? <><span className={styles.originalPrice}>{formatMoney(line.cost.subtotalAmount)}</span><strong className={styles.free}>Free</strong></> : <strong>{formatMoney(line.cost.totalAmount)}</strong>}
          </div>
        </div>
        {isGift ? (
          <div className={styles.giftChoices} role="group" aria-label="Choose your free gift">
            {GIFT_OPTIONS.map((option) => <button key={option.id} type="button" disabled={pending || product.handle === option.handle} aria-pressed={product.handle === option.handle} onClick={() => mutate(() => setGiftPreference(option.id))}>{option.label}</button>)}
          </div>
        ) : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </div>
    </li>
  );
}

function DiscountForm({ cart }: { cart: Cart }) {
  const { refresh } = useCart();
  const formId = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  // Managed bundle and gift codes are explained in plain language elsewhere.
  const managed = new Set(MANAGED_DISCOUNT_CODES);
  const applied = cart.discountCodes.filter((discount) => discount.applicable && !managed.has(discount.code));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await applyDiscount(code);
        if (result.ok) setCode("");
        else setError(result.message);
        await refresh();
      } catch {
        setError("We couldn't apply this code. Please try again.");
      }
    });
  }

  return (
    <div className={styles.discounts}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={formId} className={styles.disclosure}>
        <span><TagIcon className="size-4" aria-hidden="true" />Add a discount code</span><ChevronDownIcon className="size-4" aria-hidden="true" />
      </button>
      <div id={formId} hidden={!open}>
        <form onSubmit={submit} className={styles.codeForm}>
          <label htmlFor={`${formId}-input`} className="sr-only">Discount code</label>
          <input id={`${formId}-input`} value={code} disabled={pending} onChange={(event) => { setCode(event.target.value); setError(null); }} placeholder="Enter code" autoComplete="off" autoCapitalize="characters" aria-invalid={Boolean(error)} aria-describedby={error ? `${formId}-error` : undefined} />
          <button type="submit" disabled={pending || !code.trim()}>{pending ? "Applying…" : "Apply"}</button>
        </form>
        {error ? <p id={`${formId}-error`} role="alert" className={styles.error}>{error}</p> : null}
      </div>
      {applied.length > 0 ? <ul className={styles.appliedCodes}>{applied.map((discount) => <li key={discount.code}>
        <CheckIcon className="size-3.5" aria-hidden="true" /><span>{discount.code}</span>
        <button type="button" aria-label={`Remove ${discount.code}`} disabled={pending} onClick={() => startTransition(async () => {
          try { const result = await removeDiscount(discount.code); if (!result.ok) { setOpen(true); setError(result.message); } await refresh(); }
          catch { setOpen(true); setError("We couldn't remove this code. Please try again."); }
        })}><CloseIcon className="size-3.5" aria-hidden="true" /></button>
      </li>)}</ul> : null}
    </div>
  );
}

/** The customer's own uploaded artwork, resized without changing fulfilment. */
function artworkThumbnail(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "cdn.shopify.com") return url;
    parsed.searchParams.set("width", "240");
    return parsed.toString();
  } catch { return url; }
}

export function CartDrawer() {
  const { isOpen, close } = useCart();
  return <Overlay open={isOpen} onClose={close} label="Shopping cart" side="right" className="z-60" panelClassName={styles.panel}><CartContents /></Overlay>;
}

function CartContents() {
  const { cart, close } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const lines = cart?.lines.nodes ?? [];
  // Exclude the free gift's original price from both the subtotal and savings.
  // All amounts remain Shopify's confirmed figures, including order discounts.
  const giftValue = lines.filter((line) => line.attributes.some((attribute) => attribute.key === GIFT_ATTRIBUTE) && Number(line.cost.totalAmount.amount) === 0)
    .reduce((sum, line) => sum + Number(line.cost.subtotalAmount.amount), 0);
  const discount = cart ? Math.max(0, cartDiscountTotal(cart) - giftValue) : 0;
  const currency = cart?.cost.totalAmount.currencyCode ?? "INR";
  const undiscounted = cart ? cartUndiscountedTotal(cart) - giftValue : 0;
  const isEmpty = lines.length === 0;
  const hasGift = lines.some((line) => line.attributes.some((attribute) => attribute.key === GIFT_ATTRIBUTE));
  const bundle = cart ? appliedBundle(cart) : null;
  const freeShipping = cart?.cost.subtotalAmount.currencyCode === "INR" && amountToFreeShipping(Number(cart.cost.subtotalAmount.amount)) === 0;
  const money = (amount: number) => formatMoney({ amount: String(amount), currencyCode: currency });

  return <>
    <header className={styles.header}>
      <div className={styles.heading}><h2>Your cart</h2>{!isEmpty ? <span className={styles.count}>{cart?.totalQuantity} {cart?.totalQuantity === 1 ? "item" : "items"}</span> : null}</div>
      <button type="button" onClick={close} aria-label="Close cart" className={styles.close}><CloseIcon className="size-5" aria-hidden="true" /></button>
    </header>
    {isEmpty ? <div className={styles.empty}>
      <span className={styles.emptyIcon}><BagIcon className="size-8" aria-hidden="true" /></span>
      <h3>Your walls are waiting.</h3>
      <p>Your cart is empty. Find a print you love and make it yours.</p>
      <ButtonLink href="/products" onClick={close} className={styles.emptyButton}>Explore posters <ArrowRightIcon className="size-4" aria-hidden="true" /></ButtonLink>
    </div> : <>
      <div className={styles.body}>
        {cart?.cost.subtotalAmount.currencyCode === "INR" ? <div className={styles.shipping}><FreeShippingBar subtotal={cart.cost.subtotalAmount} /></div> : null}
        {cart ? <div className={styles.rewardTargets}>
          {bundle ? <p className={styles.appliedBundle}><CheckIcon className="size-4" aria-hidden="true" />{bundleLabel(bundle)} applied automatically.</p> : null}
          <BundleNudge cart={cart} />
          <GiftMilestoneBar subtotal={cart.cost.subtotalAmount} bundleApplied={Boolean(bundle)} giftAdded={hasGift} />
        </div> : null}
        <ul className={`${styles.items} stagger-in`} aria-label="Cart items">{lines.map((line, index) => <LineItem key={line.id} line={line} index={index} />)}</ul>
        {cart ? <div className={styles.extras}>
          <DiscountSuggestion cart={cart} />
          <DiscountForm cart={cart} />
          <p className={styles.delivery}><TruckIcon className="size-4" aria-hidden="true" />Estimated arrival <strong>{deliveryEstimate().range}</strong></p>
        </div> : null}
      </div>
      <footer className={styles.summary}>
        {discount > 0 ? <dl className={styles.breakdown}>
          <div><dt>Items subtotal</dt><dd>{money(undiscounted)}</dd></div>
          <div className={styles.savings}><dt>Discounts</dt><dd>−{money(discount)}</dd></div>
        </dl> : null}
        <div className={styles.total} aria-live="polite" aria-atomic="true"><span>Total</span><strong>{cart ? formatMoney(cart.cost.totalAmount) : "—"}</strong></div>
        <p className={styles.totalNote}>Tax included. {freeShipping ? "Free shipping." : "Shipping calculated at checkout."}</p>
        {checkoutError ? <p role="alert" className={styles.error}>{checkoutError}</p> : null}
        <a href={cart?.checkoutUrl ?? "#"} aria-disabled={!cart?.checkoutUrl || checkingOut} aria-busy={checkingOut} className={styles.checkout} onClick={async (event) => {
          if (!cart?.checkoutUrl || checkingOut) { event.preventDefault(); return; }
          event.preventDefault();
          setCheckingOut(true);
          setCheckoutError(null);
          try {
            const outcome = await startCheckout(cart);
            if (outcome.via === "fastrr") setCheckingOut(false);
          } catch {
            setCheckingOut(false);
            setCheckoutError("We couldn't open checkout. Please try again.");
          }
        }}><LockIcon className="size-4" aria-hidden="true" />{checkingOut ? "Opening checkout…" : "Checkout"}<ArrowRightIcon className="size-4" aria-hidden="true" /></a>
        <p className={styles.reassurance}>Secure checkout <span aria-hidden="true">·</span> {REPLACEMENT_WINDOW_DAYS}-day replacement</p>
      </footer>
    </>}
  </>;
}
