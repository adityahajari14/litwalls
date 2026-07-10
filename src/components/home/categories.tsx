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
          href="/products"
          linkLabel="Browse everything"
        />
      </Container>

      {/* Scrolls edge-to-edge on phones so the tiles hint at more content. */}
      <div className="mt-8 w-full overflow-x-auto no-scrollbar lg:overflow-x-visible">
        <ul className="mx-auto flex w-max gap-4 px-4 sm:px-6 lg:grid lg:w-auto lg:max-w-7xl lg:auto-cols-fr lg:grid-flow-col lg:gap-6 lg:px-8">
          {collections.map((collection) => (
            <li key={collection.id} className="w-40 shrink-0 lg:w-auto">
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

          <li className="w-40 shrink-0 lg:w-auto">
            <Link href="/custom" className="group block">
              <div className="grid aspect-3/4 place-items-center gap-2 rounded-card border-2 border-dashed border-ink-300 bg-ink-50 px-3 text-center transition-colors group-hover:border-brand-400 group-hover:bg-brand-50">
                <div>
                  <span className="mx-auto grid size-11 place-items-center rounded-full bg-ink-950 text-2xl leading-none text-white transition-colors group-hover:bg-brand-500">
                    +
                  </span>
                  <p className="mt-3 text-sm font-medium text-ink-700">
                    Upload your
                    <br />
                    own design
                  </p>
                </div>
              </div>
              <h3 className="mt-3 font-display text-xl text-ink-950 transition-colors group-hover:text-brand-600">
                Custom
              </h3>
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
