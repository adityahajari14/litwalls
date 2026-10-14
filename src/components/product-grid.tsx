import { ProductCard } from "@/components/product-card";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/shopify/types";

/**
 * The catalogue grid, shared by /products, /search and a collection page.
 *
 * These three repeated the same eight utility classes with one of them
 * changed, so the same card sat on three different vertical rhythms
 * (`gap-y-6` on /products, `gap-y-10` on the other two). Moving between them
 * is the core browsing loop, and inconsistency there is felt more than it is
 * noticed.
 *
 * The column steps (2 → 3 → 4) are deliberate and differ from the home page's
 * fixed four-item shelves: these grids hold an arbitrary number of products,
 * so a 3-column step in the middle costs nothing and keeps cards from getting
 * too narrow on a tablet.
 */
export function ProductGrid({
  products,
  className,
  /** How many leading cards load eagerly — the first row, above the fold. */
  eagerCount = 4,
}: {
  products: Product[];
  className?: string;
  eagerCount?: number;
}) {
  return (
    <ul
      className={cn(
        "reveal-stagger grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6",
        className,
      )}
    >
      {products.map((product, index) => (
        <li key={product.id} className="h-full">
          <ProductCard product={product} eager={index < eagerCount} />
        </li>
      ))}
    </ul>
  );
}

/**
 * The same grid, drawn as empty frames, for `loading.tsx`.
 *
 * Matches ProductGrid's columns and gutters exactly so the real content lands
 * in the same places the skeleton held — a skeleton on a different grid is a
 * layout shift with extra steps.
 */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul
      aria-hidden
      className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6"
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="flex flex-col">
          <div className="aspect-4/5 animate-pulse rounded-card bg-ink-100" />
          <div className="mt-4 h-4 w-3/4 animate-pulse rounded-full bg-ink-100" />
          <div className="mt-2 h-4 w-1/3 animate-pulse rounded-full bg-ink-100" />
          <div className="mt-3 h-8 animate-pulse rounded-card bg-ink-100" />
          <div className="mt-3 h-9 animate-pulse rounded-card bg-ink-100" />
        </li>
      ))}
    </ul>
  );
}
