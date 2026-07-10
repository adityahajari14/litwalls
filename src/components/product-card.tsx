import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { discountPercent } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/shopify/types";

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

  return (
    <article className={cn("group", className)}>
      <Link href={`/products/${product.handle}`} className="block">
        <div className="relative aspect-4/5 overflow-hidden rounded-card bg-ink-100 shadow-card transition-shadow duration-300 group-hover:shadow-lift">
          {product.featuredImage ? (
            <Image
              src={product.featuredImage.url}
              alt={product.featuredImage.altText ?? product.title}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 80vw"
              className={cn(
                "object-cover transition-transform duration-500 ease-out-soft group-hover:scale-105",
                soldOut && "opacity-60",
              )}
            />
          ) : null}

          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            {percent > 0 && !soldOut ? (
              <Badge tone="sale">{percent}% off</Badge>
            ) : (
              <span />
            )}
            {soldOut ? (
              <Badge tone="neutral">Sold out</Badge>
            ) : isNew ? (
              <Badge tone="new">New</Badge>
            ) : null}
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <h3 className="line-clamp-1 font-medium text-ink-900 transition-colors group-hover:text-brand-600">
            {product.title}
          </h3>
          <Price price={price} compareAt={compareAt} />
        </div>
      </Link>
    </article>
  );
}
