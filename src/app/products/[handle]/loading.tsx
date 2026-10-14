import { Container } from "@/components/ui/container";

/**
 * Two columns matching the real product page — gallery left, buy rail right —
 * so the buy button lands where the skeleton's button block was rather than
 * shifting under a thumb already reaching for it.
 */
export default function Loading() {
  return (
    <Container className="py-8 lg:py-12">
      <div className="mb-6 hidden h-4 w-72 animate-pulse rounded-full bg-ink-100 lg:block" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-20">
        <div>
          <div className="aspect-4/5 animate-pulse rounded-card bg-ink-100" />
          <div className="mt-4 flex gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="size-20 animate-pulse rounded-card bg-ink-100 sm:size-24"
              />
            ))}
          </div>
        </div>

        <div className="lg:py-2">
          <div className="h-3 w-24 animate-pulse rounded-full bg-ink-100" />
          <div className="mt-3 h-10 w-3/4 animate-pulse rounded-card bg-ink-100 sm:h-12" />
          <div className="mt-6 h-9 w-40 animate-pulse rounded-card bg-ink-100" />
          <div className="mt-2 h-3 w-56 animate-pulse rounded-full bg-ink-100" />

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-card bg-ink-100"
              />
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="h-13 flex-1 animate-pulse rounded-card bg-ink-100" />
            <div className="h-13 flex-1 animate-pulse rounded-card bg-ink-100" />
          </div>

          <div className="mt-6 h-36 animate-pulse rounded-card bg-ink-100" />
          <div className="mt-6 h-20 animate-pulse rounded-card bg-ink-100" />
        </div>
      </div>
    </Container>
  );
}
