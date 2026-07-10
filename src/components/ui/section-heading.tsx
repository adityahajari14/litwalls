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
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-2",
        className,
      )}
    >
      <div className="max-w-2xl">
        <h2 className="font-display text-4xl text-ink-950 sm:text-5xl">{title}</h2>
        {subtitle ? (
          <p className="mt-2 text-ink-600 text-pretty">{subtitle}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="shrink-0 text-sm font-medium text-ink-700 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-brand-600 hover:decoration-brand-400"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
