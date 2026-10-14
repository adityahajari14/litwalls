import { ProductGridSkeleton } from "@/components/product-grid";
import { Container } from "@/components/ui/container";

export default function Loading() {
  return (
    <Container className="py-12 lg:py-16">
      <div className="max-w-2xl">
        <div className="h-12 w-44 animate-pulse rounded-card bg-ink-100 sm:h-14" />
        <div className="mt-6 h-13 w-full animate-pulse rounded-full bg-ink-100" />
      </div>
      <div className="mt-10">
        <ProductGridSkeleton count={8} />
      </div>
    </Container>
  );
}
