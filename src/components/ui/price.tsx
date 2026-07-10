import { discountPercent, formatMoney } from "@/lib/money";
import type { Money } from "@/lib/shopify/types";
import { cn } from "@/lib/cn";

export function Price({
  price,
  compareAt,
  showDiscount = true,
  className,
}: {
  price: Money;
  compareAt?: Money | null;
  showDiscount?: boolean;
  className?: string;
}) {
  const percent = discountPercent(price, compareAt ?? null);

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span className="font-semibold text-ink-950">{formatMoney(price)}</span>
      {percent > 0 && compareAt ? (
        <>
          <span className="text-sm text-ink-400 line-through">
            {formatMoney(compareAt)}
          </span>
          {showDiscount ? (
            <span className="text-sm font-semibold text-success">
              {percent}% off
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
