import { ClockIcon, LockIcon, RulerIcon, TruckIcon } from "@/components/icons";
import { deliveryEstimate, FREE_SHIPPING_THRESHOLD } from "@/lib/marketing";
import { formatMoney } from "@/lib/money";

/** The size table, so "A3" stops being an abstraction the customer has to look up. */
const SIZES = [
  { name: "A5", mm: "148 × 210 mm", note: "Desk, or one tile in a cluster" },
  { name: "A4", mm: "210 × 297 mm", note: "The safe default for most walls" },
  { name: "A3", mm: "297 × 420 mm", note: "Statement size — above a bed or sofa" },
];

/**
 * Payment marks. Wordmarks rather than logo files: the real brand assets are
 * licensed and can't be redrawn as SVG paths, and a wrong-looking Visa logo
 * damages trust more than plain text ever would.
 */
const PAYMENT_METHODS = ["UPI", "Visa", "Mastercard", "RuPay", "Net banking"];

/**
 * The block that sits directly under the buy button and answers, in order, the
 * three questions that stop a poster purchase: when does it turn up, how big is
 * it really, and is paying safe.
 */
export function BuyReassurance() {
  const { range, dispatchesToday } = deliveryEstimate();

  const threshold = formatMoney({
    amount: String(FREE_SHIPPING_THRESHOLD),
    currencyCode: "INR",
  });

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-card border border-ink-200 bg-white p-4">
        <p className="flex items-start gap-3 text-sm text-ink-700">
          <TruckIcon className="mt-0.5 size-5 shrink-0 text-brand-500" />
          <span className="text-pretty">
            Order today and it should reach you{" "}
            <span className="font-semibold text-ink-950">{range}</span>. Free
            over {threshold}.
          </span>
        </p>

        {dispatchesToday ? (
          <p className="mt-2.5 flex items-start gap-3 text-sm text-ink-700">
            <ClockIcon className="mt-0.5 size-5 shrink-0 text-brand-500" />
            <span className="text-pretty">
              Dispatches <span className="font-semibold text-ink-950">today</span>{" "}
              if you order before 4pm.
            </span>
          </p>
        ) : null}
      </div>

      <details className="group rounded-card border border-ink-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-medium text-ink-900 transition-colors hover:text-brand-600 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-3">
            <RulerIcon className="size-5 shrink-0 text-brand-500" />
            Size guide — how big is it, really?
          </span>
          <svg
            viewBox="0 0 20 20"
            aria-hidden
            className="size-4 shrink-0 text-ink-400 transition-transform duration-300 group-open:rotate-45"
          >
            <path
              d="M10 4v12M4 10h12"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </summary>

        <ul className="divide-y divide-ink-100 border-t border-ink-100">
          {SIZES.map((size) => (
            <li
              key={size.name}
              className="flex items-baseline gap-3 px-4 py-3 text-sm"
            >
              <span className="w-8 shrink-0 font-display text-lg text-ink-950">
                {size.name}
              </span>
              <span className="w-28 shrink-0 text-ink-700">{size.mm}</span>
              <span className="text-ink-500 text-pretty">{size.note}</span>
            </li>
          ))}
        </ul>
      </details>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="flex items-center gap-1.5 text-xs text-ink-500">
          <LockIcon className="size-4 text-ink-400" />
          Secure checkout
        </span>
        {PAYMENT_METHODS.map((method) => (
          <span
            key={method}
            className="rounded border border-ink-200 bg-white px-2 py-1 text-[11px] font-medium text-ink-600"
          >
            {method}
          </span>
        ))}
      </div>
    </div>
  );
}
