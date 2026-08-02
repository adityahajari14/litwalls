"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { CloseIcon, SearchIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { Image as ShopifyImage } from "@/lib/shopify/types";

/**
 * Sticky on desktop (lg:sticky) so the artwork stays in view while the buyer
 * reads the description and FAQ below it — on a tall PDP that's the
 * difference between "still looking at what I'm buying" and "scrolled past it
 * three screens ago." Not sticky below lg: a phone screen is the viewport, so
 * there's nothing to stick against.
 */
export function Gallery({
  images,
  title,
  badge,
}: {
  images: ShopifyImage[];
  title: string;
  /** Rendered top-left over the main image — a sale or sold-out badge belongs
      on the artwork itself, not tucked into the text column below it. */
  badge?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!zoomed) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [zoomed]);

  if (images.length === 0) {
    return (
      <div className="grid aspect-4/5 place-items-center rounded-card bg-ink-100 text-sm text-ink-500 lg:sticky lg:top-24">
        No image
      </div>
    );
  }

  const current = images[active];

  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <div className="flex flex-col gap-4 lg:flex-row-reverse">
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Zoom image"
          className="group relative aspect-4/5 flex-1 overflow-hidden rounded-card border border-ink-100 bg-ink-100 shadow-card"
        >
          <Image
            key={current.url}
            src={current.url}
            alt={current.altText ?? title}
            fill
            priority
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.03]"
          />

          <span className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-white/90 text-ink-700 opacity-0 shadow-card backdrop-blur transition-opacity duration-200 group-hover:opacity-100">
            <SearchIcon className="size-4" />
          </span>

          {badge ? (
            <span className="pointer-events-none absolute left-3 top-3">{badge}</span>
          ) : null}
        </button>

        {images.length > 1 ? (
          <ul className="flex gap-3 overflow-x-auto no-scrollbar lg:w-20 lg:shrink-0 lg:flex-col lg:overflow-visible">
            {images.map((image, index) => (
              <li key={image.url} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`View image ${index + 1} of ${images.length}`}
                  aria-current={index === active}
                  className={cn(
                    "relative size-20 overflow-hidden rounded-lg bg-ink-100 ring-2 transition-all duration-200 lg:size-full lg:aspect-square",
                    index === active
                      ? "ring-ink-950"
                      : "ring-transparent hover:ring-ink-300",
                  )}
                >
                  <Image
                    src={image.url}
                    alt=""
                    fill
                    sizes="5rem"
                    className="object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {zoomed ? (
        <div className="fixed inset-0 z-70 grid place-items-center bg-ink-950/90 p-4 backdrop-blur-sm sm:p-8">
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close"
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6 sm:top-6"
          >
            <CloseIcon className="size-5" />
          </button>

          <div className="relative h-full max-h-[85vh] w-full max-w-3xl">
            <Image
              src={current.url}
              alt={current.altText ?? title}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>

          {images.length > 1 ? (
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 sm:bottom-8">
              {images.map((image, index) => (
                <button
                  key={image.url}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`View image ${index + 1} of ${images.length}`}
                  aria-current={index === active}
                  className={cn(
                    "size-2 rounded-full transition-colors",
                    index === active ? "bg-white" : "bg-white/40 hover:bg-white/70",
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
