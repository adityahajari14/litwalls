import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Collection } from "@/lib/shopify/types";

export function Categories({ collections }: { collections: Collection[] }) {
  return (
    <section className="py-16 lg:pt-24 lg:pb-16">
      <Container>
        <SectionHeading
          title="Shop by universe"
          subtitle="Find the wall that matches the fandom."
          href="/collections"
          linkLabel="Browse all collections"
        />

        {/* A wrapping grid, not a single scrolling row — with every collection
            on the site listed here, "browse all collections" should mean the
            visitor can actually see all of them without scrolling sideways.
            The custom-upload tile that used to close this row now lives in
            its own CustomPrints section, so it isn't repeated here. */}
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-6">
          {collections.map((collection) => (
            <li key={collection.id}>
              <Link href={`/collections/${collection.handle}`} className="group block">
                {/* The posters carry their own typography, so the label sits
                    below the frame rather than fighting the artwork. */}
                <div className="relative aspect-3/4 overflow-hidden rounded-card bg-ink-200 ring-1 ring-ink-900/5">
                  {collection.image ? (
                    <Image
                      src={collection.image.url}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 18vw, 10rem"
                      className="object-cover transition-transform duration-500 ease-out-soft group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid size-full place-items-center font-display text-3xl text-ink-400">
                      {collection.title.charAt(0)}
                    </div>
                  )}
                </div>
                <h3 className="mt-3 font-display text-xl text-ink-950 transition-colors group-hover:text-brand-600">
                  {collection.title}
                </h3>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
