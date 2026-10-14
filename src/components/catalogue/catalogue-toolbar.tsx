"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { CloseIcon } from "@/components/icons";
import { SORT_OPTIONS, DEFAULT_SORT, type PriceBand } from "@/lib/catalogue";
import { cn } from "@/lib/cn";

/**
 * Sort and filter for the catalogue grids.
 *
 * State lives entirely in the URL rather than in component state, which is
 * what makes a filtered grid shareable, linkable from an ad, survivable across
 * a refresh, and reachable by the back button. Every control is a real
 * navigation; the server does the filtering, so the result is still one
 * cacheable server render rather than a client-side re-query.
 *
 * `after` is dropped on every change: a cursor from the unfiltered list means
 * nothing once the filter changes, and carrying it over would silently return
 * the wrong page.
 */
export function CatalogueToolbar({
  total,
  showing,
  sizes = [],
  bands = [],
}: {
  total?: { count: number; atLeast: boolean };
  showing: number;
  /**
   * Sizes and price bands the catalogue can actually be narrowed by — both
   * derived from live Shopify data, so a control only appears when tapping it
   * can change the result.
   *
   * On the store as it stands every standard poster is a single variant at a
   * flat ₹149, so both arrive empty and this renders sort alone. Publishing
   * sizes or a price spread in Shopify makes the filters appear on their own,
   * with no change here.
   */
  sizes?: string[];
  bands?: PriceBand[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const activeSort = params.get("sort") ?? DEFAULT_SORT.value;
  const activeSize = params.get("size");
  const activePrice = params.get("price");

  function apply(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === next.get(key)) next.delete(key);
    else next.set(key, value);
    next.delete("after");

    const query = next.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  const filtersActive = Boolean(activeSize || activePrice);

  const chip =
    "inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors";

  return (
    <div
      className={cn(
        "border-y border-ink-100 py-4 transition-opacity",
        pending && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="text-sm text-ink-600" aria-live="polite">
          {total ? (
            <>
              Showing{" "}
              <span className="font-medium text-ink-900">{showing}</span> of{" "}
              <span className="font-medium text-ink-900">
                {total.atLeast ? `${total.count}+` : total.count}
              </span>{" "}
              print{total.count === 1 ? "" : "s"}
            </>
          ) : (
            <>
              <span className="font-medium text-ink-900">{showing}</span> print
              {showing === 1 ? "" : "s"}
            </>
          )}
        </p>

        <label className="flex items-center gap-2 text-sm text-ink-600">
          Sort
          <select
            value={activeSort}
            onChange={(event) => apply("sort", event.target.value)}
            className="h-9 rounded-card border border-ink-200 bg-white px-2.5 text-sm font-medium text-ink-900 focus:border-brand-400 focus:outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {sizes.length > 0 || bands.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => apply("size", size)}
              aria-pressed={activeSize === size}
              className={cn(
                chip,
                activeSize === size
                  ? "border-ink-950 bg-ink-950 text-white"
                  : "border-ink-200 text-ink-700 hover:border-ink-950 hover:text-ink-950",
              )}
            >
              {size}
            </button>
          ))}

          {sizes.length > 0 && bands.length > 0 ? (
            <span aria-hidden className="mx-1 h-5 w-px bg-ink-200" />
          ) : null}

          {bands.map((band) => (
            <button
              key={band.value}
              type="button"
              onClick={() => apply("price", band.value)}
              aria-pressed={activePrice === band.value}
              className={cn(
                chip,
                activePrice === band.value
                  ? "border-ink-950 bg-ink-950 text-white"
                  : "border-ink-200 text-ink-700 hover:border-ink-950 hover:text-ink-950",
              )}
            >
              {band.label}
            </button>
          ))}

          {filtersActive ? (
            <Link
              href={
                params.get("sort")
                  ? `${pathname}?sort=${params.get("sort")}`
                  : pathname
              }
              scroll={false}
              className="ml-1 inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-900"
            >
              <CloseIcon className="size-3.5" />
              Clear
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
