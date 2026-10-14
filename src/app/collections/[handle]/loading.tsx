import { ProductGridSkeleton } from "@/components/product-grid";
import { Container } from "@/components/ui/container";

/**
 * Mirrors the collection header band, the chip row and the grid, so the page
 * does not visibly re-flow when the real content arrives.
 */
export default function Loading() {
  return (
    <Container className="py-8 lg:py-12">
      <div className="min-h-44 animate-pulse rounded-card bg-ink-100 md:min-h-64 lg:min-h-80" />
      <div aria-hidden className="mt-6 flex gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-9 w-24 animate-pulse rounded-full bg-ink-100"
          />
        ))}
      </div>
      <div className="mt-6 h-16 animate-pulse rounded-card bg-ink-100" />
      <div className="mt-10">
        <ProductGridSkeleton count={8} />
      </div>
    </Container>
  );
}
