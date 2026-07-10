import Image from "next/image";

import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

const HERO_POSTERS = [
  { src: "/categories/marvel.jpg", offset: "-translate-y-6" },
  { src: "/categories/anime.jpg", offset: "translate-y-4" },
  { src: "/categories/music.jpg", offset: "-translate-y-8" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink-100">
      <Image
        src="/brand/hero-room.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* Warm scrim: the room photo is bright, the copy sits on its left third. */}
      <div className="absolute inset-0 bg-linear-to-r from-paper via-paper/85 to-paper/10 md:to-transparent" />

      {/* Posters hung on the empty wall — the room photo alone sells nothing.
          Sits above the scrim so the artwork keeps its colour. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 items-center justify-center gap-5 pr-[5vw] lg:flex"
      >
        {HERO_POSTERS.map((poster) => (
          <div
            key={poster.src}
            className={`relative aspect-2/3 w-36 shrink-0 overflow-hidden rounded-xs bg-white shadow-lift ring-1 ring-ink-900/10 xl:w-44 ${poster.offset}`}
          >
            <Image
              src={poster.src}
              alt=""
              fill
              sizes="11rem"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <Container className="relative">
        <div className="flex min-h-128 items-center py-16 lg:min-h-152 lg:py-24">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold tracking-wide text-ink-700 ring-1 ring-ink-200">
              <span className="size-1.5 rounded-full bg-success" />
              Printed &amp; shipped from India
            </p>

            <h1 className="mt-5 font-display text-6xl leading-[0.95] text-ink-950 sm:text-7xl lg:text-8xl">
              Posters that
              <br />
              make your
              <br />
              <span className="text-brand-500">walls talk</span>
            </h1>

            <p className="mt-5 max-w-md text-lg text-ink-700 text-pretty">
              Museum-grade 300gsm matte prints of the movies, music and anime you
              actually love. From ₹149.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/products" size="lg">
                Shop all posters
              </ButtonLink>
              <ButtonLink href="/custom" variant="ghost" size="lg">
                Make it custom
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
