import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { getCollections } from "@/lib/shopify/products";

export const metadata: Metadata = {
  title: "Collections",
  description: "Shop Litwalls posters by universe — Marvel, DC, movies, music and more.",
};

/** Same ceiling as the collection page's generateStaticParams — one list, one limit. */
const COLLECTION_COUNT = 50;

export default async function CollectionsPage() {
  const collections = await getCollections(COLLECTION_COUNT);

  return (
    <Container className="py-12 lg:py-16">
      <header className="max-w-2xl">
        <h1 className="font-display text-5xl text-ink-950 sm:text-6xl">
          Collections
        </h1>
        <p className="mt-3 text-ink-600 text-pretty">
          Every poster, sorted by universe.
        </p>
      </header>

      {collections.length === 0 ? (
        <p className="mt-12 text-ink-600">
          No collections yet. Add some in your Shopify admin and they&apos;ll
          appear here.
        </p>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
          {collections.map((collection) => (
            <li key={collection.id}>
              <Link href={`/collections/${collection.handle}`} className="group block">
                <div className="relative aspect-4/5 overflow-hidden rounded-card bg-ink-100 shadow-card transition-shadow duration-300 group-hover:shadow-lift">
                  {collection.image ? (
                    <Image
                      src={collection.image.url}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-cover transition-transform duration-500 ease-out-soft group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid size-full place-items-center font-display text-4xl text-ink-400">
                      {collection.title.charAt(0)}
                    </div>
                  )}
                </div>
                <h2 className="mt-3 font-display text-xl text-ink-950 transition-colors group-hover:text-brand-600">
                  {collection.title}
                </h2>
                {collection.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-600 text-pretty">
                    {collection.description}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
