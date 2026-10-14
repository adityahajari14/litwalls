import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

/**
 * Secondary used to hover from ink-950 to ink-800 — a warm brownish-gray a
 * long way from the near-black base. Against a crisp black button that reads
 * as the button fading or going disabled, not as an interactive response.
 *
 * The fix is the same convention every card on this site already uses on
 * hover (`hover:shadow-lift`, seen on product cards and collection tiles):
 * lift the surface instead of washing out its color. `ink-900` is barely
 * darker than the base, so the button stays rich black throughout — the
 * elevation is what signals "hoverable", not a color change. Pressing it
 * flattens back to shadow-sm and the true `ink-950`, so the button visibly
 * settles into the page on click, on top of the scale-down in BASE.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white shadow-sm hover:bg-brand-600 hover:shadow-lift active:bg-brand-700 active:shadow-sm",
  secondary:
    "bg-ink-950 text-white shadow-sm hover:bg-ink-900 hover:shadow-lift active:bg-ink-950 active:shadow-sm",
  ghost:
    "bg-transparent text-ink-900 border border-ink-200 hover:border-ink-300 hover:bg-ink-50 active:bg-ink-100",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-base",
};

/**
 * `active:scale-[0.98]` is the whole of the press feedback, and it earns its
 * place on touch specifically: a phone has no hover state, so without it the
 * only signal that a tap registered is whatever happens next — which on a slow
 * connection is nothing, for a second or two. Two percent is enough to feel
 * and too little to notice.
 */
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-card font-medium " +
  // The bare `transition` utility, not a hand-picked property list: the
  // hover lift now needs `box-shadow` alongside `background-color` and the
  // press needs `scale` (Tailwind v4 emits scale utilities as their own
  // `scale` property, not `transform` — naming `transform` here leaves the
  // press snapping instead of easing). `transition` already covers all three
  // plus color and border-color, so there's nothing left to enumerate by hand.
  "transition duration-200 " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 " +
  "disabled:active:scale-100";

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={buttonClass({ variant, size, className })} {...props} />;
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
};

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}
