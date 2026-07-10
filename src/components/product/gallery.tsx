"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/cn";
import type { Image as ShopifyImage } from "@/lib/shopify/types";

export function Gallery({
  images,
  title,
}: {
  images: ShopifyImage[];
  title: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="grid aspect-4/5 place-items-center rounded-card bg-ink-100 text-sm text-ink-500">
        No image
      </div>
    );
  }

  const current = images[active];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-4/5 overflow-hidden rounded-card bg-ink-100">
        <Image
          key={current.url}
          src={current.url}
          alt={current.altText ?? title}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 ? (
        <ul className="flex gap-3 overflow-x-auto no-scrollbar">
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`View image ${index + 1} of ${images.length}`}
                aria-current={index === active}
                className={cn(
                  "relative size-20 shrink-0 overflow-hidden rounded-lg bg-ink-100 ring-2 transition-colors",
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
  );
}
