import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { GiftIcon, ReturnIcon, ScissorsIcon, TagIcon, TruckIcon } from "@/components/icons";
import {
  FIRST_ORDER_CODE,
  FIRST_ORDER_DISCOUNT,
  FIRST_ORDER_MINIMUM,
  FREE_SHIPPING_THRESHOLD,
  GIFT_DESCRIPTION,
  GIFT_THRESHOLD,
  SINGLE_BUNDLES,
  SPLIT_BUNDLES,
} from "@/lib/offers";

/**
 * Every live offer, in one place a customer can scan in about five seconds.
 *
 * Offers scattered across a page get read as noise; collected into one block
 * under one heading they read as a reason to fill the basket. The two bundle
 * cards lead because they're the only offers that change what someone puts in
 * the cart rather than just what they pay for it.
 *
 * Each card states its own condition inline. An offer whose catch is disclosed
 * only at checkout converts once and then generates a support ticket.
 */

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
          {/* Spans two columns: it carries a four-rung ladder, and cramming
              that into a quarter-width card is what makes a good offer look
              like fine print. */}
          <li className="rounded-card bg-brand-500 p-6 sm:col-span-2">
            <TagIcon className="size-7 text-white" />
            <h3 className="mt-4 font-display text-3xl text-white">
              Buy more posters, pay for less
            </h3>
            <p className="mt-2 text-sm/6 text-white/90 text-pretty">
              Applies to single posters — mix any designs you like, the
              cheapest ones come free.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {SINGLE_BUNDLES.map((bundle) => (
                <span
                  key={bundle.code}
                  className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {bundle.pay} → {bundle.total} · {bundle.code}
                </span>
              ))}
            </div>
          </li>

          <li className="rounded-card bg-white p-6 sm:col-span-2">
            <ScissorsIcon className="size-7 text-brand-500" />
            <h3 className="mt-4 font-display text-3xl text-ink-950">
              Split posters, stacked deeper
            </h3>
            <p className="mt-2 text-sm/6 text-ink-600 text-pretty">
              Applies to split-in-3 sets — mix any designs you like.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {SPLIT_BUNDLES.map((bundle) => (
                <span
                  key={bundle.code}
                  className="rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-900"
                >
                  {bundle.pay} set{bundle.pay > 1 ? "s" : ""} → {bundle.total} sets ·{" "}
                  {bundle.code}
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

          <li className="flex flex-col justify-between rounded-card bg-white p-6 lg:col-span-2">
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
