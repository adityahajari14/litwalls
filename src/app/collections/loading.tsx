import { Container } from "@/components/ui/container";

/** Mirrors the /collections card grid so nothing re-flows when it arrives. */
export default function Loading() {
  return (
    <Container className="py-12 lg:py-16">
      <div className="max-w-2xl">
        <div className="h-4 w-20 animate-pulse rounded-full bg-ink-100" />
        <div className="mt-4 h-12 w-72 animate-pulse rounded-card bg-ink-100 sm:h-14" />
        <div className="mt-4 h-4 w-96 max-w-full animate-pulse rounded-full bg-ink-100" />
      </div>
      <ul
        aria-hidden
        className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-6"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <li
            key={index}
            className="overflow-hidden rounded-card ring-1 ring-ink-950/5"
          >
            <div className="aspect-5/4 animate-pulse bg-ink-100" />
            <div className="p-5 sm:p-6">
              <div className="h-8 w-32 animate-pulse rounded-card bg-ink-100" />
              <div className="mt-2 h-4 w-20 animate-pulse rounded-full bg-ink-100" />
            </div>
          </li>
        ))}
      </ul>
    </Container>
  );
}
