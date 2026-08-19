import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { GiftIcon, ReturnIcon, TagIcon, TruckIcon } from "@/components/icons";
import {
  BUNDLES,
  bundleSavingPercent,
  FIRST_ORDER_CODE,
  FIRST_ORDER_DISCOUNT,
  FIRST_ORDER_MINIMUM,
  FREE_SHIPPING_THRESHOLD,
  GIFT_DESCRIPTION,
  GIFT_THRESHOLD,
} from "@/lib/offers";

/**
 * Every live offer, in one place a customer can scan in about five seconds.
 *
 * Offers scattered across a page get read as noise; collected into one block
 * under one heading they read as a reason to fill the basket. The bundle card
 * leads because it is the only one that changes what someone puts in the cart
 * rather than just what they pay for it.
 *
 * Each card states its own condition inline. An offer whose catch is disclosed
 * only at checkout converts once and then generates a support ticket.
 */

const [SMALL_BUNDLE, BIG_BUNDLE] = BUNDLES;

export function Offers() {
  return (
    <section id="offers" className="scroll-mt-24 bg-ink-950 py-16 lg:py-24">
      <Container>
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl text-white sm:text-5xl">
            Offers running right now
          </h2>
          <p className="mt-2 text-ink-300 text-pretty">
            No inflated prices to discount from. These stack on top of what you
            already see on the product page.
          </p>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* The bundle spans two columns on desktop: it carries a two-rung
              ladder, and cramming both rungs into a quarter-width card is what
              makes a good offer look like fine print. */}
          <li className="rounded-card bg-brand-500 p-6 sm:col-span-2">
            <TagIcon className="size-7 text-white" />
            <h3 className="mt-4 font-display text-3xl text-white">
              Buy {SMALL_BUNDLE.pay}, get {SMALL_BUNDLE.total}
            </h3>
            <p className="mt-2 text-sm/6 text-white/90 text-pretty">
              Mix any posters you like — the {SMALL_BUNDLE.total - SMALL_BUNDLE.pay}{" "}
              cheapest come free. Go up to {BIG_BUNDLE.pay} and you get{" "}
              {BIG_BUNDLE.total}, which works out to{" "}
              {bundleSavingPercent(BIG_BUNDLE)}% off.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {BUNDLES.map((bundle) => (
                <span
                  key={bundle.code}
                  className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {bundle.pay} → {bundle.total} · {bundle.code}
                </span>
              ))}
            </div>
          </li>

          <li className="rounded-card bg-white/5 p-6 ring-1 ring-white/10">
            <GiftIcon className="size-7 text-brand-400" />
            <h3 className="mt-4 font-display text-2xl text-white text-balance">
              {GIFT_DESCRIPTION}
            </h3>
            <p className="mt-2 text-sm/6 text-ink-300 text-pretty">
              Added automatically to first orders over ₹{GIFT_THRESHOLD}. Yours
              to keep either way.
            </p>
          </li>

          <li className="rounded-card bg-white/5 p-6 ring-1 ring-white/10">
            <TagIcon className="size-7 text-brand-400" />
            <h3 className="mt-4 font-display text-2xl text-white">
              ₹{FIRST_ORDER_DISCOUNT} off your first order
            </h3>
            <p className="mt-2 text-sm/6 text-ink-300 text-pretty">
              Code{" "}
              <span className="font-semibold text-white">{FIRST_ORDER_CODE}</span>{" "}
              at checkout, on orders over ₹{FIRST_ORDER_MINIMUM}.
            </p>
          </li>

          <li className="rounded-card bg-white/5 p-6 ring-1 ring-white/10">
            <TruckIcon className="size-7 text-brand-400" />
            <h3 className="mt-4 font-display text-2xl text-white">
              Free delivery over ₹{FREE_SHIPPING_THRESHOLD}
            </h3>
            <p className="mt-2 text-sm/6 text-ink-300 text-pretty">
              Anywhere in India. Below that it&apos;s a flat ₹49 — the price you
              see at checkout is the price you pay.
            </p>
          </li>

          <li className="rounded-card bg-white/5 p-6 ring-1 ring-white/10">
            <ReturnIcon className="size-7 text-brand-400" />
            <h3 className="mt-4 font-display text-2xl text-white">
              Damaged? We reprint it free
            </h3>
            <p className="mt-2 text-sm/6 text-ink-300 text-pretty">
              Send a short video of the damaged or blurred print and a
              replacement ships free. No return, no argument.
            </p>
          </li>

          <li className="flex flex-col justify-between rounded-card bg-white p-6 sm:col-span-2 lg:col-span-1">
            <div>
              <h3 className="font-display text-2xl text-ink-950">
                Start with one
              </h3>
              <p className="mt-2 text-sm/6 text-ink-600 text-pretty">
                Posters from ₹79. Add four and the offer applies itself.
              </p>
            </div>
            <ButtonLink href="/products" className="mt-5 w-full">
              Shop posters
            </ButtonLink>
          </li>
        </ul>
      </Container>
    </section>
  );
}
