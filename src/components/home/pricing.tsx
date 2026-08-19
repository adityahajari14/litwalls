import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { CheckIcon } from "@/components/icons";
import { PRICE_GROUPS } from "@/lib/pricing";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/offers";

/**
 * The full price list, published on the home page.
 *
 * This is a trust device before it is a shopping aid. Poster stores in this
 * price bracket almost never publish a price list — the price appears only
 * after you have picked a product, which trains customers to expect the number
 * to move. Showing every size and every price up front, with no "starting
 * from" hedge, is a claim that there is nothing to discover later.
 *
 * It also does real merchandising work: someone who came for a ₹79 A5 can see
 * that A3 is ₹139, and the gap is small enough to talk them upward.
 */
export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 bg-white py-16 lg:py-24">
      <Container>
        <SectionHeading
          title="What everything costs"
          subtitle="The whole price list, up front. No size upcharges appearing at checkout."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRICE_GROUPS.map((group) => (
            <div
              key={group.id}
              className="flex flex-col rounded-card border border-ink-200 bg-paper p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-2xl text-ink-950">
                  {group.title}
                </h3>
                {group.customOnly ? (
                  <span className="mt-1 shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                    Custom only
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-sm/6 text-ink-600 text-pretty">
                {group.blurb}
              </p>

              <dl className="mt-5 flex-1 space-y-0 border-t border-ink-200">
                {group.tiers.map((tier) => (
                  <div
                    key={tier.label}
                    className="flex items-baseline justify-between gap-3 border-b border-ink-100 py-3"
                  >
                    <dt>
                      <span className="text-sm font-medium text-ink-900">
                        {tier.label}
                      </span>
                      {/* The millimetres matter: "A4" means nothing to a
                          customer who has never bought a poster before. */}
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {tier.dimensions}
                      </span>
                    </dt>
                    <dd className="shrink-0 text-sm font-semibold text-ink-950">
                      ₹{tier.price}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <ul className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3">
          {[
            `Free delivery over ₹${FREE_SHIPPING_THRESHOLD}`,
            "All prices include GST",
            "Same 300gsm matte paper across every format",
          ].map((note) => (
            <li
              key={note}
              className="flex items-center gap-2 text-sm text-ink-600"
            >
              <CheckIcon className="size-4 shrink-0 text-success" />
              {note}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
