import { TruckIcon } from "@/components/icons";
import { deliveryEstimate, FREE_SHIPPING_THRESHOLD } from "@/lib/marketing";
import { formatMoney } from "@/lib/money";

/**
 * The delivery promise, directly under the buy button. A concrete date range
 * beats "3–6 days" because the customer doesn't have to count. Server-rendered
 * with the page, which revalidates every 10 minutes, so the dates stay current.
 */
export function DeliveryEstimate() {
  const { range } = deliveryEstimate();

  const threshold = formatMoney({
    amount: String(FREE_SHIPPING_THRESHOLD),
    currencyCode: "INR",
  });

  return (
    <div className="rounded-card bg-ink-50 p-4 text-sm text-ink-700">
      <p className="flex items-start gap-3 text-pretty">
        <TruckIcon className="mt-0.5 size-5 shrink-0 text-brand-500" />
        <span>
          Order today and it should reach you{" "}
          <span className="font-semibold text-ink-950">{range}</span>. Free
          delivery over {threshold}.
        </span>
      </p>
    </div>
  );
}
