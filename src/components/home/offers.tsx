import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { GiftIcon, ReturnIcon, TagIcon, TruckIcon } from "@/components/icons";
import {
  bundleFreeCount,
  FIRST_ORDER_CODE,
  FIRST_ORDER_DISCOUNT,
  FIRST_ORDER_MINIMUM,
  FREE_SHIPPING_THRESHOLD,
  GIFT_THRESHOLD,
  SINGLE_BUNDLES,
  SPLIT_BUNDLES,
} from "@/lib/offers";

/**
 * One glance, not a spreadsheet.
 *
 * The previous version of this section printed every discount code as a
 * visible badge — six of them, plus the bundle ladder spelled out rung by
 * rung. No brand at this tier does that on a home page. The headline states
 * the shape of the deal in plain terms and the exact bundle rungs move to the
 * FAQ, where someone reads them because they are already deciding how many to
 * add — not while skimming the home page for whether to trust the store at
 * all. The copy stays descriptive rather than exhortative throughout — no
 * "right now", no manufactured urgency — because a discount is a fact about
 * the price, not an event with a countdown.
 *
 * FIRST_ORDER_CODE is the one code still shown here, deliberately: unlike the
 * bundle codes it applies regardless of quantity, so it is the offer most
 * people in this section will actually use. It is also a real Shopify
 * discount code, not an automatic discount — saying it "applies itself" would
 * be a claim the checkout can't back up. It is never auto-applied even in the
 * cart: DiscountSuggestion in the cart drawer surfaces it and asks for one tap
 * once the order qualifies, rather than changing the total without asking.
 */

const bestSingle = SINGLE_BUNDLES[SINGLE_BUNDLES.length - 1];
const bestSplit = SPLIT_BUNDLES[SPLIT_BUNDLES.length - 1];

export function Offers() {
  return (
    <section id="offers" className="scroll-mt-24 bg-ink-950 py-16 lg:py-24">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-brand-400 uppercase">
              Offers
            </p>
            <h2 className="mt-3 font-display text-5xl leading-[0.95] text-white sm:text-6xl">
              Order more,
              <br />
              save more
            </h2>
            <p className="mt-4 max-w-md text-ink-300 text-pretty">
              Mix and match any design. Order{" "}
              <span className="text-white">
                {bestSingle.pay} posters and {bundleFreeCount(bestSingle)} are
                free
              </span>
              , or order{" "}
              <span className="text-white">
                {bestSplit.pay} split sets and {bundleFreeCount(bestSplit)} are
                free
              </span>
              . Full details and codes are in the FAQ below.
            </p>
            <ButtonLink href="/products" size="lg" className="mt-7">
              Shop posters
            </ButtonLink>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            <li className="flex items-start gap-3 rounded-card bg-white/5 p-5 ring-1 ring-white/10">
              <TruckIcon className="mt-0.5 size-5 shrink-0 text-brand-400" />
              <div>
                <p className="text-sm font-semibold text-white">
                  Free delivery over ₹{FREE_SHIPPING_THRESHOLD}
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  A flat ₹49 below that, anywhere in India.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-card bg-white/5 p-5 ring-1 ring-white/10">
              <TagIcon className="mt-0.5 size-5 shrink-0 text-brand-400" />
              <div>
                <p className="text-sm font-semibold text-white">
                  ₹{FIRST_ORDER_DISCOUNT} off your first order
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  Use code {FIRST_ORDER_CODE} on orders over ₹
                  {FIRST_ORDER_MINIMUM}.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-card bg-white/5 p-5 ring-1 ring-white/10">
              <GiftIcon className="mt-0.5 size-5 shrink-0 text-brand-400" />
              <div>
                <p className="text-sm font-semibold text-white">
                  5 free prints, your choice
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  Mini pocket prints or retro prints, added once your order
                  passes ₹{GIFT_THRESHOLD} — unless a bundle discount already
                  applies.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-card bg-white/5 p-5 ring-1 ring-white/10">
              <ReturnIcon className="mt-0.5 size-5 shrink-0 text-brand-400" />
              <div>
                <p className="text-sm font-semibold text-white">
                  Free reprint on damage
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  Send a short video and we&apos;ll ship a free replacement.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </Container>
    </section>
  );
}
