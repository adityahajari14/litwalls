import { cn } from "@/lib/cn";

type Tone = "sale" | "new" | "neutral" | "outline";

const TONES: Record<Tone, string> = {
  sale: "bg-brand-500 text-white",
  new: "bg-ink-950 text-white",
  neutral: "bg-white/90 text-ink-800 ring-1 ring-ink-200",
  outline: "bg-transparent text-ink-600 ring-1 ring-ink-200",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
