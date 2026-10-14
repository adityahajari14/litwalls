"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ArrowRightIcon, CloseIcon, SearchIcon } from "@/components/icons";
import { Overlay } from "@/components/ui/overlay";
import { cn } from "@/lib/cn";
import type { CollectionSummary } from "@/lib/shopify/types";

/** The lean per-result shape returned by `/api/search` — see that route. */
type SearchHit = {
  id: string;
  handle: string;
  title: string;
  category: string | null;
  image: { url: string; alt: string } | null;
  price: string;
  priceFrom: boolean;
  soldOut: boolean;
};

/** Two characters is where a search stops matching the whole catalogue. */
const MIN_QUERY = 2;

/** Long enough to skip most mid-word keystrokes, short enough to feel live. */
const DEBOUNCE_MS = 200;

/**
 * Search, as a modal over whatever page the shopper is on.
 *
 * Results appear as they type. The full results page only opens on an explicit
 * request for it — Enter, the search button, or "See all results" — so looking
 * something up never costs the page they were on.
 *
 * The shell is <Overlay>, which portals into <body>. This dialog was rendered
 * inside the header before, and the header's `backdrop-blur` made it the
 * containing block for `position: fixed`: the dimmed backdrop covered only the
 * header strip, and a click anywhere on the page beneath did not close it.
 */
export function SearchDialog({
  open,
  onClose,
  collections = [],
}: {
  open: boolean;
  onClose: () => void;
  /** Offered as shortcuts before anything has been typed. */
  collections?: CollectionSummary[];
}) {
  return (
    <Overlay
      open={open}
      onClose={onClose}
      label="Search posters"
      side="top"
      className="z-70"
      backdropClassName="bg-ink-950/30"
      // Near the top on a phone, where the keyboard takes the bottom half of
      // the screen; lower on a desktop, where it reads as a centred palette.
      panelClassName="mt-3 w-[min(36rem,calc(100vw-1.5rem))] overflow-hidden rounded-card bg-white shadow-lift ring-1 ring-ink-950/[0.06] sm:mt-[12vh]"
    >
      {/* Mounted only while the dialog is, so the query and results start
          clean on every open with nothing to reset by hand. */}
      <SearchPanel onClose={onClose} collections={collections} />
    </Overlay>
  );
}

function SearchPanel({
  onClose,
  collections,
}: {
  onClose: () => void;
  collections: CollectionSummary[];
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  // The term `results` belongs to. Until it matches what is typed, the list on
  // screen is the previous answer — shown dimmed, never as "no matches".
  const [resultsFor, setResultsFor] = useState("");
  const [failed, setFailed] = useState(false);
  // -1 means "nothing in the list is highlighted" — Enter then runs the full
  // search rather than opening a product.
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = query.trim();
  const ready = trimmed.length >= MIN_QUERY;
  const loading = ready && resultsFor !== trimmed;

  // Debounced live query. A fresh AbortController per run means a slow early
  // request can never land after a later one and overwrite newer results.
  // While the term is too short the effect just bails — the render below keys
  // off `ready`, so stale results stay hidden without a reset.
  useEffect(() => {
    if (!ready) return;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as { results: SearchHit[] };
        setResults(data.results);
        setFailed(false);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setResults([]);
        setFailed(true);
      }
      setResultsFor(trimmed);
      setActiveIndex(-1);
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [ready, trimmed]);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  const runFullSearch = useCallback(() => {
    if (!trimmed) return;
    go(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [go, trimmed]);

  const visibleResults = ready ? results : [];
  const searched = ready && resultsFor !== "";

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, visibleResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, -1));
    } else if (event.key === "Enter") {
      // Enter opens the results page. The one exception is a row the shopper
      // has deliberately arrowed down to, which opens that product — the
      // standard behaviour for a list you can drive from the keyboard.
      const hit = visibleResults[activeIndex];
      if (hit) {
        event.preventDefault();
        go(`/products/${hit.handle}`);
      }
    }
  }

  return (
    <>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          runFullSearch();
        }}
        className="flex items-center gap-1 border-b border-ink-100 py-1.5 pr-2 pl-2"
      >
        {/* The magnifier is the submit button, not decoration: tapping it is
            the same as pressing Enter. */}
        <button
          type="submit"
          aria-label="Search"
          disabled={!trimmed}
          className="grid size-10 shrink-0 place-items-center rounded-full text-ink-500 transition duration-200 enabled:text-ink-900 enabled:hover:bg-ink-100 enabled:active:scale-95"
        >
          {loading ? (
            <span
              aria-hidden
              className="size-4 animate-spin rounded-full border-2 border-ink-200 border-t-brand-500"
            />
          ) : (
            <SearchIcon className="size-4.5" />
          )}
        </button>

        <input
          data-autofocus
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={visibleResults.length > 0}
          aria-controls="search-dialog-list"
          aria-activedescendant={
            activeIndex >= 0 ? `search-hit-${activeIndex}` : undefined
          }
          placeholder="Search posters…"
          aria-label="Search posters"
          // 16px below `sm`: iOS Safari zooms the page into any smaller field.
          className="h-11 w-full min-w-0 bg-transparent text-base text-ink-900 placeholder:text-ink-400 focus:outline-none sm:text-[15px]"
        />

        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="grid size-9 shrink-0 place-items-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <CloseIcon className="size-4" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium tracking-wide text-ink-400 uppercase transition-colors hover:bg-ink-50 hover:text-ink-700"
        >
          <span className="hidden sm:inline">esc</span>
          <span className="sm:hidden">Close</span>
        </button>
      </form>

      <div className="max-h-[min(26rem,52vh)] overflow-y-auto overscroll-contain sm:max-h-[min(26rem,60vh)]">
        {!ready ? (
          // Nothing typed yet: somewhere to go instead of an empty box.
          <div className="px-5 py-5">
            {collections.length > 0 ? (
              <>
                <p className="text-xs font-semibold tracking-[0.14em] text-ink-400 uppercase">
                  Browse a collection
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {collections.slice(0, 8).map((collection) => (
                    <li key={collection.id}>
                      <Link
                        href={`/collections/${collection.handle}`}
                        onClick={onClose}
                        className="inline-flex min-h-9 items-center rounded-full border border-ink-200 px-3.5 text-[13px] font-medium text-ink-700 transition-colors hover:border-ink-950 hover:text-ink-950"
                      >
                        {collection.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <p
              className={cn(
                "text-[13px] text-ink-400",
                collections.length > 0 && "mt-4",
              )}
            >
              Type to see matches as you go. Press Enter for the full results.
            </p>
          </div>
        ) : !searched ? (
          <p className="px-5 py-8 text-center text-sm text-ink-400">
            Searching…
          </p>
        ) : visibleResults.length === 0 && !loading ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-ink-600">
              {failed ? (
                "Search isn't responding right now."
              ) : (
                <>
                  No matches for{" "}
                  <span className="font-medium text-ink-900">“{trimmed}”</span>.
                </>
              )}
            </p>
            <div className="mt-3 flex items-center justify-center gap-4 text-sm">
              <Link
                href="/products"
                onClick={onClose}
                className="text-ink-500 underline decoration-ink-200 underline-offset-4 transition-colors hover:text-ink-900"
              >
                All posters
              </Link>
              <Link
                href="/custom"
                onClick={onClose}
                className="text-brand-600 underline decoration-brand-200 underline-offset-4 transition-colors hover:text-brand-700"
              >
                Make a custom poster
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ul
              id="search-dialog-list"
              role="listbox"
              // Rows are keyed by product, so only the ones that are new to
              // the list animate in; a result that survives the next
              // keystroke stays put instead of blinking.
              className={cn(
                "stagger-in p-1.5 transition-opacity duration-200",
                loading && "opacity-50",
              )}
            >
              {visibleResults.map((hit, index) => (
                <li
                  key={hit.id}
                  role="presentation"
                  style={{ "--i": index } as React.CSSProperties}
                >
                  <button
                    type="button"
                    id={`search-hit-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onClick={() => go(`/products/${hit.handle}`)}
                    onMouseMove={() => setActiveIndex(index)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-card px-3 py-2 text-left transition-colors",
                      index === activeIndex ? "bg-ink-50" : "bg-transparent",
                    )}
                  >
                    <span className="relative block h-14 w-11 shrink-0 overflow-hidden rounded bg-ink-100 ring-1 ring-ink-950/5">
                      {hit.image ? (
                        <Image
                          src={hit.image.url}
                          alt=""
                          fill
                          sizes="44px"
                          className={cn(
                            "object-cover",
                            hit.soldOut && "opacity-50 grayscale-35",
                          )}
                        />
                      ) : null}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-900">
                        {hit.title}
                      </span>
                      {hit.category ? (
                        <span className="block truncate text-xs text-ink-400">
                          {hit.category}
                        </span>
                      ) : null}
                    </span>

                    <span className="shrink-0 text-[13px] text-ink-600">
                      {hit.soldOut ? (
                        <span className="text-ink-400">Sold out</span>
                      ) : (
                        <>
                          {hit.priceFrom ? (
                            <span className="text-ink-400">from </span>
                          ) : null}
                          {hit.price}
                        </>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={runFullSearch}
              className="group/all flex w-full items-center justify-between border-t border-ink-100 px-5 py-3 text-left text-[13px] font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-950"
            >
              <span>
                See all results for{" "}
                <span className="text-ink-950">“{trimmed}”</span>
              </span>
              <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover/all:translate-x-0.5" />
            </button>
          </>
        )}
      </div>
    </>
  );
}
