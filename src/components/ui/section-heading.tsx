import Link from "next/link";
import { cn } from "@/lib/cn";

export function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel = "View all",
  className,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start justify-between gap-x-6 gap-y-1 sm:flex-row sm:items-end sm:gap-y-2",
        className,
      )}
    >
      <div className="min-w-0 max-w-2xl">
        <h2 className="font-display text-4xl text-ink-950 sm:text-5xl">{title}</h2>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-600 text-pretty sm:text-base">{subtitle}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-ink-700 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-brand-600 hover:decoration-brand-400 sm:min-h-0 sm:py-1"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
