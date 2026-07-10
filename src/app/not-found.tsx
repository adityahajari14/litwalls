import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function NotFound() {
  return (
    <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="font-display text-7xl text-brand-500">404</p>
      <h1 className="mt-4 font-display text-4xl text-ink-950">
        This wall is empty
      </h1>
      <p className="mt-3 max-w-md text-ink-600 text-pretty">
        We couldn&apos;t find that page. The poster may have sold out or the link
        may be wrong.
      </p>
      <ButtonLink href="/products" size="lg" className="mt-8">
        Browse all posters
      </ButtonLink>
    </Container>
  );
}
