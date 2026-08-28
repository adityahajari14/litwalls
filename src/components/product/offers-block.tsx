import { CheckIcon, GiftIcon, SparkIcon, TagIcon } from "@/components/icons";
import {
  bundleFreeCount,
  FIRST_ORDER_CODE,
  FIRST_ORDER_DISCOUNT,
  FIRST_ORDER_MINIMUM,
  GIFT_DESCRIPTION,
  GIFT_THRESHOLD,
  SINGLE_BUNDLES,
  SPLIT_BUNDLES,
  type Bundle,
} from "@/lib/offers";
import { SPLIT_TAG } from "@/lib/shopify/products";
import type { Product } from "@/lib/shopify/types";

/**
 * The bundle ladder, on the product page where someone is deciding how many to
 * buy — the home page keeps this to a one-line summary. Every rung is a real
 * Shopify buy-X-get-Y discount the cart applies on its own as the quantity
 * crosses it (`syncCartDiscounts`), so the copy says "applies automatically",
 * not "use code".
 *
 * Each rung shows the effective per-poster price it lands you at — the number a
 * customer can actually compare — while the headline stays "get N free" rather
 * than making them divide to see the deal. Split-in-3 sets run their own ladder
 * counted in sets, not panels.
 */
export function OffersBlock({ product }: { product: Product }) {
  const isSplit = product.tags.includes(SPLIT_TAG);
  const bundles = isSplit ? SPLIT_BUNDLES : SINGLE_BUNDLES;
  const unit = isSplit ? "set" : "poster";

  const min = Number(product.priceRange.minVariantPrice.amount);
  const max = Number(product.priceRange.maxVariantPrice.amount);
  const priceVaries = min !== max;

  // What one unit works out to once the rung's free items are counted in. Uses
  // the cheapest size when sizes are priced differently, hence the "from".
  const effective = (bundle: Bundle) =>
    Math.round((min * bundle.pay) / bundle.total);

  const best = bundles[bundles.length - 1];

  return (
    <section
      aria-label="Offers"
      className="overflow-hidden rounded-card border border-ink-200 bg-white"
    >
      <p className="flex items-center gap-2 bg-brand-50/60 px-4 py-3 text-sm font-semibold text-ink-950">
        <TagIcon className="size-4 shrink-0 text-brand-500" />
        Buy more, pay the same — mix any designs
      </p>

      <ul className="grid grid-cols-2 gap-2.5 p-3">
        {bundles.map((bundle) => {
          const free = bundleFreeCount(bundle);
          const isBest = bundle === best;

          return (
            <li
              key={bundle.code}
              className={`relative rounded-card border p-3 ${
                isBest
                  ? "border-brand-300 bg-brand-50/50"
                  : "border-ink-200 bg-white"
              }`}
            >
              {isBest ? (
                <span className="absolute -top-2 right-3 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                  Best value
                </span>
              ) : null}

              <p className="text-xs font-bold tracking-wide text-ink-950 uppercase">
                Buy {bundle.pay}, get {free} free
              </p>
              <p className="mt-1.5 text-lg font-semibold text-brand-600">
                {priceVaries ? "from " : ""}₹{effective(bundle)}
                <span className="text-xs font-medium text-ink-500">
                  {" "}
                  / {unit}
                </span>
              </p>
            </li>
          );
        })}
      </ul>

      <ul className="space-y-3 border-t border-ink-100 px-4 py-4 text-sm text-ink-600">
        <li className="flex items-start gap-2.5">
          <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
          <span>No code needed — the discount is applied automatically at checkout.</span>
        </li>
        <li className="flex items-start gap-2.5">
          <GiftIcon className="mt-0.5 size-4 shrink-0 text-brand-500" />
          <span>
            Spend over ₹{GIFT_THRESHOLD} and get {GIFT_DESCRIPTION} free
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <SparkIcon className="mt-0.5 size-4 shrink-0 text-brand-500" />
          <span>
            First order? Use code{" "}
            <span className="font-semibold text-ink-900">{FIRST_ORDER_CODE}</span>{" "}
            for ₹{FIRST_ORDER_DISCOUNT} off orders over ₹{FIRST_ORDER_MINIMUM}.
          </span>
        </li>
      </ul>
    </section>
  );
}
