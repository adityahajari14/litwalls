import { ProductGridSkeleton } from "@/components/product-grid";
import { Container } from "@/components/ui/container";

export default function Loading() {
  return (
    <Container className="py-8 lg:py-12">
      <div className="h-4 w-16 animate-pulse rounded-full bg-ink-100" />
      <div className="mt-4 h-11 w-72 animate-pulse rounded-card bg-ink-100 sm:h-12" />
      <div className="mt-4 h-4 w-[28rem] max-w-full animate-pulse rounded-full bg-ink-100" />
      <div className="mt-10">
        <ProductGridSkeleton count={4} />
      </div>
    </Container>
  );
}
