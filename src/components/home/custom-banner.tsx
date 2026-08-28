import Image from "next/image";

import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

const STEPS = [
  "Upload any image, artwork or photo",
  "Pick your size, up to 13″ × 19″",
  "We print it on 300gsm matte and ship it",
];

export function CustomBanner() {
  return (
    <section className="py-12 lg:py-16">
      <Container>
        <div className="grid overflow-hidden rounded-card bg-ink-950 lg:grid-cols-2">
          <div className="p-8 sm:p-12 lg:p-16">
            <p className="text-xs font-semibold tracking-[0.2em] text-brand-400 uppercase">
              Custom posters
            </p>
            <h2 className="mt-4 font-display text-5xl text-white sm:text-6xl">
              Your wall,
              <br />
              your artwork
            </h2>
            <p className="mt-4 max-w-md text-ink-300 text-pretty">
              Send us anything — a photo, a poster you designed, your band&apos;s
              cover art. We print it at the same quality as everything else here.
            </p>

            <ol className="mt-8 space-y-3">
              {STEPS.map((step, index) => (
                <li key={step} className="flex items-start gap-3 text-sm text-ink-200">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            <ButtonLink href="/custom" size="lg" className="mt-9">
              Start your custom poster
            </ButtonLink>
          </div>

          <div className="relative min-h-72 lg:min-h-full">
            <Image
              src="/posters/travis-scott.jpg"
              alt="A custom poster printed and hung above a sideboard"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover object-center"
            />
            {/* Fades the photo into the panel so the seam never reads as a crop. */}
            <div className="absolute inset-0 bg-linear-to-t from-ink-950/70 to-transparent lg:bg-linear-to-r lg:from-ink-950 lg:via-ink-950/20 lg:to-transparent" />
          </div>
        </div>
      </Container>
    </section>
  );
}
