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
 * the shape of the deal ("buy more, pay less") and the exact bundle rungs
 * move to the FAQ, where someone reads them because they are already deciding
 * how many to add — not while skimming the home page for whether to trust the
 * store at all.
 *
 * FIRST_ORDER_CODE is the one code still shown here, deliberately: unlike the
 * bundle codes it applies to every first order regardless of quantity, so it
 * is the offer most people in this section will actually use. It is also a
 * real Shopify discount code, not an automatic discount — saying it "applies
 * itself" would be a claim the checkout can't back up.
 */

const bestSingle = SINGLE_BUNDLES[SINGLE_BUNDLES.length - 1];
const bestSplit = SPLIT_BUNDLES[SPLIT_BUNDLES.length - 1];

export function Offers() {
  return (
    <section id="offers" className="scroll-mt-24 bg-ink-950 py-14 lg:py-20">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-brand-400 uppercase">
              Right now
            </p>
            <h2 className="mt-3 font-display text-5xl leading-[0.95] text-white sm:text-6xl">
              Buy more,
              <br />
              pay for less
            </h2>
            <p className="mt-4 max-w-md text-ink-300 text-pretty">
              Mix any designs you like. Up to{" "}
              <span className="text-white">
                buy {bestSingle.pay}, get {bundleFreeCount(bestSingle)} free
              </span>{" "}
              on posters, or{" "}
              <span className="text-white">
                buy {bestSplit.pay}, get {bundleFreeCount(bestSplit)} free
              </span>{" "}
              on split sets — see the codes in the FAQ below.
            </p>
            <ButtonLink href="/products" size="lg" className="mt-7">
              Shop the offer
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
                  Flat ₹49 below that, anywhere in India.
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
                  Code {FIRST_ORDER_CODE}, on orders over ₹{FIRST_ORDER_MINIMUM}.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-card bg-white/5 p-5 ring-1 ring-white/10">
              <GiftIcon className="mt-0.5 size-5 shrink-0 text-brand-400" />
              <div>
                <p className="text-sm font-semibold text-white">
                  5 free mini prints
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  On first orders over ₹{GIFT_THRESHOLD}.
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
                  Send a video, we ship a replacement.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </Container>
    </section>
  );
}
