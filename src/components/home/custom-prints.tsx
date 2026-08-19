import Link from "next/link";

import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  CameraIcon,
  ImageIcon,
  PrinterIcon,
  ScissorsIcon,
  UploadIcon,
} from "@/components/icons";
import { groupFromPrice, PRICE_GROUPS } from "@/lib/pricing";

/**
 * The custom-print range: every product a customer makes from their own image.
 *
 * This is a *category* grid, not a product grid, and deliberately so. These
 * four things have no fixed artwork to photograph — the picture is whatever
 * the customer uploads — so a Shopify product grid would show four near-blank
 * mockups. Naming the format, its sizes and its real starting price does the
 * work that a product photo does elsewhere.
 *
 * Prices come from PRICE_GROUPS, so this section can never quote a figure the
 * product page contradicts.
 */

const ICONS = {
  poster: ImageIcon,
  split: ScissorsIcon,
  mini: PrinterIcon,
  polaroid: CameraIcon,
} as const;

/** How each format is described when it is the customer's own image on it. */
const CUSTOM_COPY: Record<string, string> = {
  poster: "Any photo or artwork, printed as a single poster.",
  split: "One image split across three panels for a bigger wall.",
  mini: "Wallet-sized prints — for a desk, a mirror, a phone case.",
  polaroid: "Your photos as polaroid-style prints, ready to peg up.",
};

export function CustomPrints() {
  return (
    <section id="custom" className="scroll-mt-24 bg-ink-50 py-16 lg:py-24">
      <Container>
        <SectionHeading
          title="Design your own prints"
          subtitle="Upload a photo, pick a format, and we print it on the same 300gsm matte paper as everything else here."
          href="/custom"
          linkLabel="Start uploading"
        />

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRICE_GROUPS.map((group) => {
            const Icon = ICONS[group.id as keyof typeof ICONS] ?? ImageIcon;

            return (
              <li key={group.id}>
                <Link
                  href="/custom"
                  className="group flex h-full flex-col rounded-card border border-ink-200 bg-white p-6 transition-all duration-200 hover:border-brand-300 hover:shadow-lift"
                >
                  {/* An upload frame rather than a product photo: it shows the
                      customer where their own image goes, which is the whole
                      proposition here. */}
                  <div className="relative grid aspect-4/5 place-items-center rounded-lg border-2 border-dashed border-ink-300 bg-ink-50 text-center transition-colors group-hover:border-brand-400 group-hover:bg-brand-50">
                    <div>
                      <Icon className="mx-auto size-9 text-ink-400 transition-colors group-hover:text-brand-500" />
                      <p className="mt-3 px-4 font-display text-lg text-ink-500 transition-colors group-hover:text-brand-600">
                        Your image
                        <br />
                        here
                      </p>
                    </div>

                    {group.customOnly ? (
                      <span className="absolute top-3 right-3 rounded-full bg-ink-950 px-2.5 py-1 text-[11px] font-semibold text-white">
                        Custom only
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-5 font-display text-2xl text-ink-950">
                    {group.title}
                  </h3>
                  <p className="mt-1.5 flex-1 text-sm/6 text-ink-600 text-pretty">
                    {CUSTOM_COPY[group.id] ?? group.blurb}
                  </p>

                  <p className="mt-4 border-t border-ink-100 pt-4 text-sm text-ink-500">
                    <span className="font-semibold text-ink-950">
                      From ₹{groupFromPrice(group)}
                    </span>{" "}
                    · {group.tiers.length}{" "}
                    {group.tiers.length === 1 ? "size" : "sizes"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* One shared entry point under the grid: whichever format someone
            picked, the next step is the same upload form. */}
        <div className="mt-8 flex flex-col items-center gap-3 rounded-card bg-ink-950 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-display text-2xl text-white">
              We check your file before you pay
            </p>
            <p className="mt-1 text-sm text-ink-300 text-pretty">
              Upload it and we&apos;ll tell you straight away whether it&apos;s
              sharp enough to print at the size you picked.
            </p>
          </div>
          <Link
            href="/custom"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            <UploadIcon className="size-4" />
            Upload your image
          </Link>
        </div>
      </Container>
    </section>
  );
}
