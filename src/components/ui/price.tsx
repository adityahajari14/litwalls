import { discountPercent, formatMoney } from "@/lib/money";
import type { Money } from "@/lib/shopify/types";
import { cn } from "@/lib/cn";

/** Type scale for the main amount. Omit to size it via `className` as before. */
const SIZES = {
  sm: "text-[13px]",
  md: "text-base",
  lg: "text-2xl",
  xl: "text-3xl",
} as const;

export function Price({
  price,
  compareAt,
  showDiscount = true,
  size,
  className,
}: {
  price: Money;
  compareAt?: Money | null;
  showDiscount?: boolean;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const percent = discountPercent(price, compareAt ?? null);

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span
        className={cn(
          "font-semibold text-ink-950",
          size && SIZES[size],
        )}
      >
        {formatMoney(price)}
      </span>
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
