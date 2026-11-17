import Image from "next/image";
import Link from "next/link";

import { ArrowRightIcon } from "@/components/icons";
import { CollectionArtwork } from "@/components/collection-artwork";
import { COLLECTION_COVERS } from "@/lib/collection-covers";
import { IMAGE_PLACEHOLDER } from "@/lib/image-placeholder";
import type { CollectionSummary } from "@/lib/shopify/types";

export function CollectionCard({
  collection,
  headingLevel = 3,
}: {
  collection: CollectionSummary;
  headingLevel?: 2 | 3;
}) {
  const cover = COLLECTION_COVERS[collection.handle];
  const src = collection.image?.url;
  const custom = collection.handle === "custom-prints";
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <Link
      href={custom ? "/custom" : `/collections/${collection.handle}`}
      className="group block h-full overflow-hidden rounded-card bg-white shadow-card ring-1 ring-ink-950/8 transition duration-300 ease-out-soft hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500 motion-safe:hover:-translate-y-1"
    >
      <div className="relative aspect-3/2 overflow-hidden bg-ink-950">
        {cover ? (
          <div className="size-full transition-transform duration-500 ease-out-soft motion-safe:group-hover:scale-105">
            <CollectionArtwork cover={cover} />
          </div>
        ) : src ? (
          <Image
            src={src}
            alt=""
            fill
            sizes="(min-width: 2000px) 330px, (min-width: 1408px) 310px, (min-width: 1024px) calc((100vw - 136px) / 4), (min-width: 640px) calc((100vw - 72px) / 2), calc((100vw - 44px) / 2)"
            placeholder={IMAGE_PLACEHOLDER}
            className="object-cover transition-transform duration-500 ease-out-soft motion-safe:group-hover:scale-105"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center font-display text-6xl text-white/80">
            {collection.title.charAt(0)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 p-3 sm:gap-x-4 sm:p-5">
        <div className="col-span-2 min-w-0 sm:col-span-1 sm:row-span-2">
          <Heading className="font-display text-2xl leading-none text-ink-950 transition-colors group-hover:text-brand-600 sm:text-3xl">
            {collection.title}
          </Heading>
          <p className="mt-1.5 hidden text-xs leading-relaxed text-ink-600 sm:block">
            {cover?.tagline ?? "Find your next favourite print."}
          </p>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-600 sm:hidden">
          {cover?.tagline ?? "Find your next favourite print."}
        </p>
        <span aria-hidden="true" className="mt-1.5 grid size-6 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-900 transition-colors group-hover:bg-brand-500 group-hover:text-white sm:mt-0 sm:size-9">
          <ArrowRightIcon className="size-3.5 sm:size-4" />
        </span>
      </div>
    </Link>
  );
}
