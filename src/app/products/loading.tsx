import { ProductGridSkeleton } from "@/components/product-grid";
import { Container } from "@/components/ui/container";

/**
 * Held while the catalogue query runs. Without it, tapping "All posters" left
 * the previous page frozen on screen until Shopify answered, which on a slow
 * connection reads as a tap that didn't register — and taps that feel broken
 * get repeated or abandoned.
 */
export default function Loading() {
  return (
    <Container className="py-12 lg:py-16">
      <div className="max-w-2xl">
        <div className="h-12 w-64 animate-pulse rounded-card bg-ink-100 sm:h-14" />
        <div className="mt-4 h-4 w-80 max-w-full animate-pulse rounded-full bg-ink-100" />
      </div>
      <div className="mt-10">
        <ProductGridSkeleton count={8} />
      </div>
    </Container>
  );
}
