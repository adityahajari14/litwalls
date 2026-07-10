"use client";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const clamp = (next: number) =>
    Math.max(min, max === undefined ? next : Math.min(max, next));

  const buttonClass =
    "grid size-11 place-items-center text-lg text-ink-700 transition-colors hover:text-ink-950 disabled:pointer-events-none disabled:text-ink-300";

  return (
    <div className="inline-flex items-center rounded-full border border-ink-200">
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(clamp(next));
        }}
        aria-label="Quantity"
        // Spinners fight the custom buttons; the arrows are the control here.
        className="w-10 [appearance:textfield] border-0 bg-transparent text-center text-sm font-medium text-ink-950 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || (max !== undefined && value >= max)}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
