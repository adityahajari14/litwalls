import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/cn";
import type { Collection } from "@/lib/shopify/types";
import { IMAGE_PLACEHOLDER } from "@/lib/image-placeholder";

/**
 * Column count is chosen from how many collections there actually are, rather
 * than being fixed at six.
 *
 * A fixed six-column grid holding four collections leaves two empty cells and
 * reads as a row that failed to load. Tailwind can't compose a class name at
 * runtime (`lg:grid-cols-${n}` never survives the JIT scan), so the options
 * are enumerated here as whole class strings.
 *
 * Capped at 6: past that the tiles get too narrow to read the artwork, and the
 * grid wraps to a second row on its own, which is the right answer for a store
 * with a lot of collections.
 */
const COLUMNS: Record<number, string> = {
  1: "sm:grid-cols-1 lg:grid-cols-1",
  2: "sm:grid-cols-2 lg:grid-cols-2",
  3: "sm:grid-cols-3 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-3 lg:grid-cols-5",
};

const DEFAULT_COLUMNS = "sm:grid-cols-3 lg:grid-cols-6";

/**
 * Most collections the home page will show.
 *
 * This section previously rendered whatever it was handed, and the home page
 * hands it 50 — so at twenty collections it became four rows of tiles sitting
 * between the hero and the first product, and it grew silently every time a
 * collection was added in Shopify. Six fills one row at the widest step; the
 * "Browse all collections" link carries the rest.
 */
const MAX_TILES = 6;

export function Categories({ collections }: { collections: Collection[] }) {
  const shown = collections.slice(0, MAX_TILES);
  const columns = COLUMNS[shown.length] ?? DEFAULT_COLUMNS;

  return (
    <section className="bg-paper py-16 lg:py-24">
      <Container>
        <SectionHeading
          title="Shop by collection"
          subtitle="Explore our posters by collection."
          href="/collections"
          linkLabel="Browse all collections"
        />

        <ul className={cn("reveal-stagger mt-10 grid grid-cols-2 gap-4 lg:gap-6", columns)}>
          {shown.map((collection) => (
            <li key={collection.id}>
              <Link
                href={`/collections/${collection.handle}`}
                className="group block"
              >
                <div className="relative aspect-4/5 overflow-hidden rounded-card bg-ink-100 shadow-card ring-1 ring-ink-950/5 transition-shadow duration-300 group-hover:shadow-lift">
                  {collection.image ? (
                    <Image
                      src={collection.image.url}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                      placeholder={IMAGE_PLACEHOLDER}
                      className="object-cover transition-transform duration-500 ease-out-soft group-hover:scale-105"
                    />
                  ) : (
                    /* No collection image set in Shopify. A big initial on the
                       brand tint reads as a deliberate tile rather than a
                       broken one — but the real fix is uploading a collection
                       image in Shopify admin. */
                    <div className="grid size-full place-items-center bg-ink-950">
                      <span className="font-display text-5xl text-white/90">
                        {collection.title.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="mt-3 text-[15px] font-medium text-ink-900 transition-colors group-hover:text-brand-600">
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
