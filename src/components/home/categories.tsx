import { CollectionCard } from "@/components/collection-card";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { orderCollectionCards } from "@/lib/collection-covers";
import type { CollectionSummary } from "@/lib/shopify/types";

export function Categories({ collections }: { collections: CollectionSummary[] }) {
  return (
    <section id="shop-by-collection" aria-label="Shop by collection" className="scroll-mt-24 bg-paper py-10 sm:py-14 lg:py-20">
      <Container>
        <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-brand-600 uppercase">
          Find your world
        </p>
        <SectionHeading
          title="Shop by collection"
          subtitle="Whatever you’re into, there’s a print for your wall."
          href="/collections"
          linkLabel="Explore collections"
        />

        <ul className="reveal-stagger mt-7 grid grid-cols-2 gap-3 sm:mt-9 sm:gap-6 lg:grid-cols-4">
          {orderCollectionCards(collections).map((collection) => (
            <li key={collection.id} className="min-w-0">
              <CollectionCard collection={collection} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
