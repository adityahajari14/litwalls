import { cn } from "@/lib/cn";

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cn("size-4 shrink-0", className)}>
      <path
        fill="currentColor"
        d="M10 1.6l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.88l-5.2 2.73.99-5.79L1.58 7.72l5.82-.85z"
      />
    </svg>
  );
}

export function Rating({
  rating,
  reviewCount,
  className,
}: {
  rating: number;
  reviewCount?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, rating));
  const label =
    reviewCount === undefined
      ? `Rated ${clamped} out of 5`
      : `Rated ${clamped} out of 5 from ${reviewCount} reviews`;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative inline-flex" role="img" aria-label={label}>
        <div className="flex text-ink-200">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} />
          ))}
        </div>
        {/* Clips a full row of stars so fractional ratings render honestly. */}
        <div
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${(clamped / 5) * 100}%` }}
        >
          <div className="flex w-max text-brand-500">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} />
            ))}
          </div>
        </div>
      </div>
      <span className="text-sm text-ink-600">
        <span className="font-medium text-ink-900">{clamped.toFixed(1)}</span>
        {reviewCount !== undefined ? (
          <> ({reviewCount.toLocaleString("en-IN")})</>
        ) : null}
      </span>
    </div>
  );
}
