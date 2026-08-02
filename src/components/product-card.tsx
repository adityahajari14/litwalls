"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { BagIcon, CheckIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { trackAddToCart } from "@/lib/analytics/shopify";
import { trackMetaAddToCart } from "@/lib/analytics/meta-pixel";
import { discountPercent } from "@/lib/money";
import { addItem } from "@/lib/shopify/actions";
import { cn } from "@/lib/cn";
import { defaultVariant, type Product } from "@/lib/shopify/types";

export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: Product;
  priority?: boolean;
  className?: string;
}) {
  const price = product.priceRange.minVariantPrice;
  const compareAt = product.compareAtPriceRange.minVariantPrice;
  const percent = discountPercent(price, compareAt);
  const isNew = product.tags.includes("new");
  const soldOut = !product.availableForSale;

  const variant = defaultVariant(product);
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const { refresh, open } = useCart();

  // Products have no options, so there is exactly one variant to add — a
  // click is the whole decision. No picker, no page visit required.
  //
  // No router.refresh() here: unlike the PDP, a grid card has no per-item
  // stock count on screen to reconcile, and addItem() already revalidates
  // the cart server-side — refreshing the whole grid on every click would
  // just be wasted work if someone quick-adds several cards in a row.
  function quickAdd(event: React.MouseEvent) {
    event.preventDefault();
    if (!variant || pending) return;

    startTransition(async () => {
      const result = await addItem(variant.id, 1);
      if (!result.ok) return;

      const cart = await refresh();
      if (cart) {
        trackAddToCart(cart, product, variant, 1);
        trackMetaAddToCart(product, variant, 1);
      }

      setAdded(true);
      // Long enough to register as feedback, short enough that a second
      // add-to-cart click (a different card) doesn't feel stuck behind it.
      setTimeout(() => setAdded(false), 1200);
      open();
    });
  }

  return (
    <article className={cn("group", className)}>
      <Link href={`/products/${product.handle}`} className="block">
        <div
          className={cn(
            "relative aspect-4/5 overflow-hidden rounded-card bg-ink-100 shadow-card ring-1 ring-ink-950/5 transition-shadow duration-300",
            !soldOut && "group-hover:shadow-lift",
          )}
        >
          {product.featuredImage ? (
            <Image
              src={product.featuredImage.url}
              alt={product.featuredImage.altText ?? product.title}
              fill
              priority={priority}
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

          {!soldOut && variant ? (
            <button
              type="button"
              onClick={quickAdd}
              disabled={pending}
              aria-label={added ? `Added ${product.title} to cart` : `Add ${product.title} to cart`}
              className={cn(
                "absolute bottom-3 right-3 grid size-10 place-items-center rounded-full shadow-card backdrop-blur transition-all duration-200",
                added
                  ? "bg-success text-white"
                  : "bg-white/95 text-ink-900 hover:bg-ink-950 hover:text-white",
                // Always reachable on touch — there is no hover to reveal it
                // with. Fades in on hover only for devices that actually have
                // a fine pointer and real :hover, which a width breakpoint
                // can't tell you (a mouse-driven narrow window still hovers;
                // a wide tablet still doesn't).
                "opacity-100 [@media(any-hover:hover)]:opacity-0 [@media(any-hover:hover)]:group-hover:opacity-100",
                pending && "opacity-100",
                "disabled:cursor-wait",
              )}
            >
              {added ? (
                <CheckIcon className="size-4.5" />
              ) : (
                <BagIcon className={cn("size-4.5", pending && "animate-pulse")} />
              )}
            </button>
          ) : null}
        </div>

        <div className="mt-3.5 space-y-1">
          <h3 className="line-clamp-1 text-[15px] font-medium text-ink-900 transition-colors group-hover:text-brand-600">
            {product.title}
          </h3>
          <Price price={price} compareAt={compareAt} className="text-[15px]" />
        </div>
      </Link>
    </article>
  );
}
