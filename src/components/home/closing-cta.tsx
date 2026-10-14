import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { CheckIcon } from "@/components/icons";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/offers";
import { ENTRY_PRICE } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";

/**
 * The last screen of the home page. Someone who has read this far is as warm
 * as they will ever be — before this, the page ended on the FAQ and left them
 * to scroll back up to find a buy button.
 *
 * The headline echoes the hero's "walls talk" line rather than leaning on a
 * pain-point ("your wall is still empty") or a countdown ("tonight", "this
 * week") to close. The offer is already stated earlier on the page; this
 * section's job is just to make the buy button easy to find again.
 */
export function ClosingCta() {
  const threshold = formatMoney({
    amount: String(FREE_SHIPPING_THRESHOLD),
    currencyCode: "INR",
  });

  const assurances = [
    `Free delivery over ${threshold}`,
    "Dispatched within 24 hours",
    "Free replacement if it arrives damaged",
  ];

  return (
    <section className="border-t border-ink-100 bg-white py-16 lg:py-24">
      <Container>
        <div className="reveal mx-auto max-w-2xl text-center">
          <h2 className="font-display text-5xl text-ink-950 sm:text-6xl text-balance">
            Give your walls something to say
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-ink-600 text-pretty">
            300gsm matte prints from ₹{ENTRY_PRICE}, printed to order in
            India.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/products" size="lg">
              Shop all posters
            </ButtonLink>
            <ButtonLink href="/custom" variant="ghost" size="lg">
              Upload your own
            </ButtonLink>
          </div>

          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {assurances.map((assurance) => (
              <li
                key={assurance}
                className="flex items-center gap-1.5 text-sm text-ink-600"
              >
                <CheckIcon className="size-4 shrink-0 text-success" />
                {assurance}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
