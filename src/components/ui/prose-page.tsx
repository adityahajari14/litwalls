import { Container } from "@/components/ui/container";

/**
 * The shared shell for the written pages — policies, about, bulk.
 *
 * These pages exist to be *read*, so the column is capped near 65ch rather
 * than stretched to the grid the shop pages use. Tailwind v4 has no typography
 * plugin here, so the rhythm is set once with descendant selectors instead of
 * being restated on every heading and paragraph in seven files.
 */
export function ProsePage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  /** Policy pages need a visible last-reviewed date to be worth anything. */
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <Container className="py-12 lg:py-16">
      <header className="max-w-2xl">
        <h1 className="font-display text-5xl text-ink-950 sm:text-6xl">
          {title}
        </h1>
        {intro ? (
          <p className="mt-4 text-lg text-ink-600 text-pretty">{intro}</p>
        ) : null}
        {updated ? (
          <p className="mt-4 text-sm text-ink-500">Last updated {updated}</p>
        ) : null}
      </header>

      <div
        className={[
          "mt-12 max-w-2xl text-ink-700",
          "[&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-ink-950",
          "[&_h3]:mt-8 [&_h3]:font-medium [&_h3]:text-ink-950",
          "[&_p]:mt-4 [&_p]:text-pretty",
          "[&_ul]:mt-4 [&_ul]:space-y-2 [&_li]:flex [&_li]:gap-3",
          "[&_li]:before:mt-2.5 [&_li]:before:size-1.5 [&_li]:before:shrink-0",
          "[&_li]:before:rounded-full [&_li]:before:bg-brand-400 [&_li]:before:content-['']",
          "[&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-4",
          "[&_strong]:font-medium [&_strong]:text-ink-950",
        ].join(" ")}
      >
        {children}
      </div>
    </Container>
  );
}
