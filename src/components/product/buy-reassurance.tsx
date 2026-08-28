import { RulerIcon } from "@/components/icons";
import { DeliveryEstimate } from "@/components/product/delivery-estimate";
import { PaymentMarks } from "@/components/product/payment-marks";
import { SizeGuide } from "@/components/product/size-guide";

/**
 * The block under the buy button on the custom-print form: delivery estimate,
 * a foldable size guide, and payment marks. The regular product page composes
 * these three pieces itself so the size guide can sit in its main accordion —
 * this wrapper keeps the custom form's layout in one call.
 */
export function BuyReassurance() {
  return (
    <div className="mt-6 space-y-4">
      <DeliveryEstimate />

      <details className="group rounded-card border border-ink-200">
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
        <div className="border-t border-ink-100 p-4">
          <SizeGuide />
        </div>
      </details>

      <PaymentMarks />
    </div>
  );
}
