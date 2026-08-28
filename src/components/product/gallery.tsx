"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { CloseIcon, SearchIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { Image as ShopifyImage } from "@/lib/shopify/types";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="size-5">
      <path
        d={dir === "left" ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * One large edge-to-edge frame with a thumbnail strip beneath it, sticky on
 * desktop so the art stays in view while the buyer reads on. Fills the frame
 * with `object-cover` rather than mounting the mockup on a padded ground —
 * the poster reads as big and confident, matching what a shopper expects from
 * a poster storefront, at the cost of cropping a sliver off the mockup's
 * edges (the mockups are lifestyle photos, not flat artwork, so this is a safe
 * trade).
 */
export function Gallery({
  images,
  title,
  badge,
}: {
  images: ShopifyImage[];
  title: string;
  /** Rendered over the frame, top-left — a sale or sold-out badge belongs on
      the artwork, not tucked into the text column. */
  badge?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  // The lightbox portals into document.body (see below), which doesn't exist
  // during SSR or the first client render. useSyncExternalStore's
  // server/client snapshot split gives a mount flag without the cascading
  // re-render a setState-in-effect would cause.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const count = images.length;
  const step = useCallback(
    (delta: number) => setActive((i) => (i + delta + count) % count),
    [count],
  );

  useEffect(() => {
    if (!zoomed) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
      if (event.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [zoomed, step]);

  if (count === 0) {
    return (
      <div className="grid aspect-4/5 w-full place-items-center rounded-card bg-ink-100 text-sm text-ink-500 lg:sticky lg:top-24">
        No image
      </div>
    );
  }

  const current = images[active];

  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <div className="group relative aspect-4/5 overflow-hidden rounded-card bg-ink-100 ring-1 ring-ink-950/5">
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Zoom image"
          className="absolute inset-0"
        >
          <Image
            key={current.url}
            src={current.url}
            alt={current.altText ?? title}
            fill
            priority
            sizes="(min-width: 1024px) 46rem, 100vw"
            className="object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.02]"
          />
        </button>

        {badge ? (
          <span className="pointer-events-none absolute top-4 left-4">{badge}</span>
        ) : null}

        {count > 1 ? (
          <span className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-ink-950/70 px-2.5 py-1 text-xs font-medium text-white tabular-nums backdrop-blur">
            {active + 1} / {count}
          </span>
        ) : null}

        <span className="pointer-events-none absolute right-4 bottom-4 grid size-10 place-items-center rounded-full bg-white/90 text-ink-700 opacity-0 shadow-card backdrop-blur transition-opacity duration-200 group-hover:opacity-100">
          <SearchIcon className="size-4" />
        </span>

        {/* Always visible, not hover-only — a touch screen has no hover, and
            these are the only way to move through the gallery besides the
            thumbnail strip. */}
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                step(-1);
              }}
              aria-label="Previous image"
              className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink-800 shadow-card backdrop-blur transition-colors hover:bg-white sm:size-11"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                step(1);
              }}
              aria-label="Next image"
              className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink-800 shadow-card backdrop-blur transition-colors hover:bg-white sm:size-11"
            >
              <Chevron dir="right" />
            </button>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <ul className="mt-4 flex gap-3 overflow-x-auto no-scrollbar">
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`View image ${index + 1} of ${count}`}
                aria-current={index === active}
                className={cn(
                  "relative size-20 shrink-0 overflow-hidden rounded-card bg-ink-100 ring-2 transition-all duration-200 sm:size-24",
                  index === active
                    ? "ring-ink-950"
                    : "ring-ink-950/10 hover:ring-ink-300",
                )}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="6rem"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {mounted && zoomed
        ? createPortal(
            <div className="fixed inset-0 z-70 grid place-items-center bg-ink-950/90 p-4 backdrop-blur-sm sm:p-8">
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close"
            className="absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:top-6 sm:right-6"
          >
            <CloseIcon className="size-5" />
          </button>

          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous image"
                className="absolute top-1/2 left-4 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
              >
                <Chevron dir="left" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next image"
                className="absolute top-1/2 right-4 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
              >
                <Chevron dir="right" />
              </button>
            </>
          ) : null}

          <div className="relative h-full max-h-[82vh] w-full max-w-2xl">
            <Image
              src={current.url}
              alt={current.altText ?? title}
              fill
              sizes="90vw"
              className="object-contain drop-shadow-2xl"
            />
          </div>

          {count > 1 ? (
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 sm:bottom-8">
              {images.map((image, index) => (
                <button
                  key={image.url}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`View image ${index + 1} of ${count}`}
                  aria-current={index === active}
                  className={cn(
                    "size-2 rounded-full transition-colors",
                    index === active ? "bg-white" : "bg-white/40 hover:bg-white/70",
                  )}
                />
              ))}
            </div>
          ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
