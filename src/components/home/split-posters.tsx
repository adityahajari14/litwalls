import Image from "next/image";

import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { priceGroup } from "@/lib/pricing";

/**
 * Split-in-3 posters get their own section rather than staying folded into
 * CustomPrints' shared grid. They're the highest-AOV format in the catalogue
 * and the one most people haven't seen before, so they need enough room to
 * actually show what "one image, three panels" looks like — a single card
 * in a 4-up grid can't do that.
 *
 * The three panels are one photo sliced with object-position rather than
 * three separate images, so the visual is honest about what a real split
 * poster looks like: continuous artwork, not three unrelated frames.
 *
 * Prices come from pricing.ts, the same source the price list and PDP read
 * from, so this can never quote a figure the product page contradicts.
 */

const group = priceGroup("split");
const cheapest = group?.tiers[0];

const PANEL_POSITIONS = ["0% 20%", "50% 20%", "100% 20%"];

export function SplitPosters() {
  if (!group || !cheapest) return null;

  return (
    <section className="bg-ink-950 py-16 lg:py-24">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-brand-400 uppercase">
              Split posters
            </p>
            <h2 className="mt-3 font-display text-5xl leading-[0.95] text-white sm:text-6xl">
              One image,
              <br />
              three panels
            </h2>
            <p className="mt-4 max-w-md text-ink-300 text-pretty">
              For the wall a single poster can&apos;t cover. One piece of
              artwork spread across three frames, printed on the same 300gsm
              matte paper as everything else here.
            </p>

            <dl className="mt-7 grid max-w-xs grid-cols-3 gap-3">
              {group.tiers.map((tier) => (
                <div key={tier.label} className="rounded-card bg-white/5 p-3.5 ring-1 ring-white/10">
                  <dt className="text-xs text-ink-400">{tier.label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-white">
                    ₹{tier.price}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/custom" size="lg">
                Design your split poster
              </ButtonLink>
              <span className="text-sm text-ink-400">From ₹{cheapest.price}</span>
            </div>
          </div>

          <div className="flex gap-2.5">
            {PANEL_POSITIONS.map((position) => (
              <div
                key={position}
                className="relative aspect-2/3 flex-1 overflow-hidden rounded-lg shadow-lift ring-1 ring-white/10"
              >
                <Image
                  src="/brand/hero-room.jpg"
                  alt="A split-in-3 poster hung across a wall"
                  fill
                  sizes="(min-width: 1024px) 16vw, 30vw"
                  style={{ objectPosition: position }}
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
