import Image from "next/image";

import { cn } from "@/lib/cn";
import { IMAGE_PLACEHOLDER } from "@/lib/image-placeholder";
import type { Image as ShopifyImage } from "@/lib/shopify/types";

/**
 * Where each poster sits, for one, two or three of them. Percentages of the
 * box, so the fan scales with whatever it is dropped into; the box is expected
 * to be roughly 5:4.
 *
 * `spread` is what a hovered card does: the outer posters lean further out and
 * the middle one lifts, as if the stack were being fanned open. It only fires
 * inside a `group`, so a fan used as decoration stays still.
 */
const LAYOUTS: Record<number, { base: string; spread: string }[]> = {
  1: [
    {
      base: "left-[27%] top-[10%] z-10 w-[46%]",
      spread: "group-hover:-translate-y-[3%] group-hover:scale-[1.03]",
    },
  ],
  2: [
    {
      base: "left-[13%] top-[14%] w-[42%] -rotate-6",
      spread: "group-hover:-translate-x-[5%] group-hover:-rotate-9",
    },
    {
      base: "right-[13%] top-[14%] z-10 w-[42%] rotate-6",
      spread: "group-hover:translate-x-[5%] group-hover:rotate-9",
    },
  ],
  3: [
    {
      base: "left-[6%] top-[20%] w-[40%] -rotate-9",
      spread: "group-hover:-translate-x-[7%] group-hover:-rotate-12",
    },
    {
      base: "left-[27%] top-[10%] z-10 w-[46%]",
      spread: "group-hover:-translate-y-[4%] group-hover:scale-[1.03]",
    },
    {
      base: "right-[6%] top-[20%] w-[40%] rotate-9",
      spread: "group-hover:translate-x-[7%] group-hover:rotate-12",
    },
  ],
};

/**
 * A small fanned stack of a collection's own posters.
 *
 * This is what a collection looks like on the site now. None of the store's
 * collections has a cover image set in Shopify, so every collection tile used
 * to be an initial on a black rectangle — on a site that sells artwork. The
 * posters inside the collection are a better cover than any single image
 * anyway: they show the range, and they change as the collection does.
 *
 * Fills its parent, which must be positioned.
 */
export function PosterFan({
  images,
  title,
  sizes = "(min-width: 1024px) 14vw, (min-width: 640px) 22vw, 42vw",
  eager = false,
}: {
  images: ShopifyImage[];
  /** Used only for the fallback initial when there is no artwork at all. */
  title: string;
  sizes?: string;
  eager?: boolean;
}) {
  const shown = images.slice(0, 3);

  if (shown.length === 0) {
    return (
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-7xl text-ink-300">
          {title.charAt(0)}
        </span>
      </div>
    );
  }

  const layout = LAYOUTS[shown.length];

  // With three, the middle poster should be the collection's first — it is
  // the one in front. Reordering here keeps that true without the caller
  // having to know how the fan is laid out.
  const ordered =
    shown.length === 3 ? [shown[1], shown[0], shown[2]] : shown;

  return (
    <div className="absolute inset-0">
      {ordered.map((image, index) => (
        <div
          key={image.url}
          className={cn(
            "absolute aspect-4/5 overflow-hidden rounded-[3px] bg-ink-200 shadow-lift ring-1 ring-ink-950/10",
            "transition-[translate,rotate,scale] duration-500 ease-out-soft",
            layout[index].base,
            layout[index].spread,
          )}
        >
          <Image
            src={image.url}
            alt=""
            fill
            sizes={sizes}
            loading={eager ? "eager" : "lazy"}
            placeholder={IMAGE_PLACEHOLDER}
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
