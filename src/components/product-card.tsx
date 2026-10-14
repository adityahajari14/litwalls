"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { CheckIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { trackGaAddToCart } from "@/lib/analytics/google-analytics";
import { trackAddToCart } from "@/lib/analytics/shopify";
import { trackMetaAddToCart } from "@/lib/analytics/meta-pixel";
import { discountPercent } from "@/lib/money";
import { IMAGE_PLACEHOLDER } from "@/lib/image-placeholder";
import { isCustomProduct } from "@/lib/product";
import { addItem } from "@/lib/shopify/actions";
import { cn } from "@/lib/cn";
import {
  hasSizeChoice,
  sizeOptions,
  variantForSize,
  type Product,
  type ProductVariant,
} from "@/lib/shopify/types";

/**
 * A card-width label for a size. `13" × 19"` is wide enough to break the row
 * on a phone-width card, and the inch marks carry no information a poster
 * shopper needs at this size — the full label is on the product page.
 */
function shortSize(size: string): string {
  return size.replace(/"\s*×\s*/, "×");
}

/**
 * The variant the card opens on: the cheapest one that's actually buyable,
 * not just the cheapest overall. Defaulting to a sold-out size would show a
 * "from ₹X" the customer can't act on without first picking something else.
 */
function startingVariant(product: Product): ProductVariant | null {
  const nodes = product.variants.nodes;
  if (nodes.length === 0) return null;

  const inStock = nodes.filter((variant) => variant.availableForSale);
  const pool = inStock.length > 0 ? inStock : nodes;

  return pool.reduce((cheapest, variant) =>
    Number(variant.price.amount) < Number(cheapest.price.amount)
      ? variant
      : cheapest,
  );
}

export function ProductCard({
  product,
  eager = false,
  className,
}: {
  product: Product;
  /** Load immediately instead of lazily — for cards above the fold. Not
   *  `preload`: a row of four cards is four LCP candidates, and preloading all
   *  of them just splits the same bandwidth four ways. */
  eager?: boolean;
  className?: string;
}) {
  const isNew = product.tags.includes("new");
  const soldOut = !product.availableForSale;
  // A custom print cannot be bought from a card: there is no artwork yet, and
  // the size is chosen against the artwork on the upload page. So the card
  // offers neither a size nor a quick add — only the way in.
  const isCustom = isCustomProduct(product);
  const needsSizeChoice = !isCustom && hasSizeChoice(product);
  const sizes = sizeOptions(product);

  const initial = startingVariant(product);

  // Null until the customer actually picks — which is what separates "from
  // ₹79, and here's the cheapest size highlighted" from "you chose A3, it
  // costs ₹139". Both are honest; showing "from" next to a size someone
  // deliberately selected is not.
  const [pickedSize, setPickedSize] = useState<string | null>(null);
  const picked = pickedSize ? variantForSize(product, pickedSize) : null;
  const selected = picked ?? initial;

  const showFrom = (needsSizeChoice || isCustom) && !picked;
  const price = selected?.price ?? product.priceRange.minVariantPrice;
  const compareAt = selected?.compareAtPrice ?? null;
  // Tied to the price actually on screen, so the badge and the number under
  // it can never disagree.
  const percent = discountPercent(price, compareAt);

  const unavailable = soldOut || !selected || !selected.availableForSale;

  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const { refresh, open } = useCart();

  // Outside the card's <Link>, so this never doubles as a navigation click —
  // same reasoning as the size buttons below.
  function addToCart(event: React.MouseEvent) {
    event.preventDefault();
    if (!selected || pending || unavailable || isCustom) return;

    startTransition(async () => {
      const result = await addItem(selected.id, 1);
      if (!result.ok) return;

      const cart = await refresh();
      if (cart) {
        trackAddToCart(cart, product, selected, 1);
        trackMetaAddToCart(product, selected, 1);
        trackGaAddToCart(product, selected, 1);
      }

      setAdded(true);
      // Long enough to register as feedback, short enough that a second
      // add-to-cart click (a different card) doesn't feel stuck behind it.
      setTimeout(() => setAdded(false), 1200);
      open();
    });
  }

  const href = isCustom
    ? `/custom/${product.handle}`
    : `/products/${product.handle}`;

  return (
    <article className={cn("group flex h-full flex-col", className)}>
      {/* Two links to the same product (image + title) would otherwise give
          keyboard and screen-reader users a duplicate stop with nothing to
          distinguish it — this one carries no name of its own, so it's
          removed from both instead of trying to label it. */}
      <Link href={href} className="block" aria-hidden="true" tabIndex={-1}>
        <div
          className={cn(
            "relative aspect-4/5 overflow-hidden rounded-card bg-ink-100 ring-1 ring-ink-950/5 transition-shadow duration-300",
            !soldOut && "group-hover:shadow-lift",
          )}
        >
          {product.featuredImage ? (
            <Image
              src={product.featuredImage.url}
              alt={product.featuredImage.altText ?? product.title}
              fill
              loading={eager ? "eager" : "lazy"}
              placeholder={IMAGE_PLACEHOLDER}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 80vw"
              className={cn(
                "object-cover transition-transform duration-500 ease-out-soft",
                !soldOut && "group-hover:scale-105",
                soldOut && "opacity-50 grayscale-35",
              )}
            />
          ) : null}

          {/* A flat opacity dip reads as "loading," not "unavailable" — a
              scrim plus a centered label is unambiguous at a glance. */}
          {soldOut ? (
            <div className="absolute inset-0 flex items-center justify-center bg-ink-950/10">
              <Badge tone="neutral" className="shadow-card">
                Sold out
              </Badge>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
              {percent > 0 ? <Badge tone="sale">{percent}% off</Badge> : <span />}
              {isNew ? <Badge tone="new">New</Badge> : null}
            </div>
          )}
        </div>
      </Link>

      <div className="mt-4 flex flex-1 flex-col">
        <Link href={href} className="block">
          <h3 className="line-clamp-1 text-[15px] font-medium text-ink-900 transition-colors group-hover:text-brand-600">
            {product.title}
          </h3>
        </Link>

        {/* No "% off" here — the badge on the image above already carries it,
            and repeating it is what pushed this line past a phone-width
            card's edge, orphaning "From" onto a row of its own. */}
        <div className="mt-1.5 flex items-baseline gap-x-1.5 whitespace-nowrap">
          {showFrom ? (
            <span className="text-[11px] font-medium tracking-wide text-ink-400 uppercase">
              From
            </span>
          ) : null}
          {/* The "% off" badge lives inside the image link, which is
              aria-hidden to avoid a duplicate stop — so without this a screen
              reader announced two prices and never said one was a discount. */}
          {percent > 0 ? (
            <span className="sr-only">{percent}% off. </span>
          ) : null}
          <Price
            price={price}
            compareAt={compareAt}
            showDiscount={false}
            size="md"
          />
        </div>

        {/* Every size visible at once, one tap to choose. A dropdown would be
            a tighter box, but it hides the options until opened, costs two
            taps, and gives the customer no way to compare sizes while
            scanning a grid — all of which matter more on a card than the few
            pixels of height saved. */}
        {needsSizeChoice && sizes.length > 1 ? (
          <div
            role="group"
            aria-label={`Size — ${product.title}`}
            className="mt-2.5 flex flex-wrap gap-1 sm:gap-1.5"
          >
            {sizes.map((size) => {
              const candidate = variantForSize(product, size);
              const isSelected = Boolean(candidate) && candidate?.id === selected?.id;
              const outOfStock = !candidate || !candidate.availableForSale;

              return (
                <button
                  key={size}
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    setPickedSize(size);
                  }}
                  disabled={outOfStock}
                  aria-pressed={isSelected}
                  aria-label={outOfStock ? `${size} — sold out` : size}
                  className={cn(
                    // min-h-8 keeps every chip a real touch target rather than
                    // a text-height sliver, which is what made the previous
                    // inline control awkward to hit on a phone. The tighter
                    // width/padding below sm is what lets all four sizes sit
                    // on one row in a two-up phone grid instead of breaking
                    // to a second row on some cards and not others.
                    "inline-flex min-h-8 min-w-7 items-center justify-center rounded-card border px-1.5 text-[11.5px] leading-none font-medium transition-colors sm:min-w-9 sm:px-2",
                    isSelected
                      ? "border-ink-950 bg-ink-950 text-white"
                      : "border-ink-200 text-ink-700 hover:border-ink-950 hover:text-ink-950",
                    outOfStock &&
                      "cursor-not-allowed border-ink-100 text-ink-300 line-through hover:border-ink-100 hover:text-ink-300",
                  )}
                >
                  {shortSize(size)}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Pushes the button to the bottom so a row of cards keeps its
            buttons on one line, whether or not a card has size options. */}
        <div className="mt-3 flex-1" />

        {isCustom && !unavailable ? (
          <ButtonLink href={href} size="sm" variant="secondary" className="w-full">
            Upload your artwork
          </ButtonLink>
        ) : (
          <Button
            type="button"
            size="sm"
            variant={unavailable ? "ghost" : "secondary"}
            disabled={unavailable || pending}
            onClick={addToCart}
            className="w-full"
          >
            {unavailable ? (
              "Sold out"
            ) : added ? (
              <>
                <CheckIcon className="size-4 animate-tick-in" />
                Added to cart
              </>
            ) : pending ? (
              "Adding…"
            ) : (
              "Add to cart"
            )}
          </Button>
        )}
      </div>
    </article>
  );
}
