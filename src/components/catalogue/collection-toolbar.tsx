"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { ChevronDownIcon, CloseIcon } from "@/components/icons";
import { DEFAULT_SORT, SORT_OPTIONS, sortOption } from "@/lib/catalogue";
import type { CollectionFacet } from "@/lib/collection-filters";
import { cn } from "@/lib/cn";
import styles from "./collection-toolbar.module.css";

export function CollectionToolbar({ count, subjects, formats, subjectLabel, subjectTotal, formatTotal, activeSubject, activeFormat }: {
  count: number;
  subjects: CollectionFacet[];
  formats: CollectionFacet[];
  subjectLabel: string;
  subjectTotal: number;
  formatTotal: number;
  activeSubject?: string;
  activeFormat?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const activeSort = sortOption(params.get("sort") ?? undefined).value;
  const shown = expanded ? subjects : subjects.filter((facet, index) => index < 8 || facet.value === activeSubject);
  const clearHref = activeSort === DEFAULT_SORT.value ? pathname : `${pathname}?sort=${encodeURIComponent(activeSort)}`;

  function apply(key: "subject" | "format" | "sort", value: string | null) {
    const next = new URLSearchParams(params.toString());
    // Old price-filter bookmarks must not silently narrow this collection.
    for (const retired of ["price", "size", "after"]) next.delete(retired);
    if (!value || value === next.get(key) || (key === "sort" && value === DEFAULT_SORT.value)) next.delete(key);
    else next.set(key, value);
    const query = next.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  function chip(facet: CollectionFacet, key: "subject" | "format", active?: string) {
    return <button key={facet.value} type="button" aria-pressed={active === facet.value} disabled={pending || (facet.count === 0 && active !== facet.value)} onClick={() => apply(key, facet.value)} className={styles.chip}>
      {facet.label}<span>{facet.count}</span>
    </button>;
  }

  return <section className={cn(styles.toolbar, pending && styles.pending)} aria-label="Filter collection" aria-busy={pending}>
    <div className={styles.header}>
      <div className={styles.resultCount}>
        <p aria-live="polite"><strong>{count}</strong> print{count === 1 ? "" : "s"}{activeSubject || activeFormat ? count === 1 ? " matches your filters" : " match your filters" : " in this collection"}</p>
        {activeSubject || activeFormat ? <Link href={clearHref} scroll={false} className={styles.clear}><CloseIcon className="size-3.5" aria-hidden="true" />Clear filters</Link> : null}
      </div>
      <label className={styles.sort}>Sort<select aria-label="Sort" value={activeSort} disabled={pending} onChange={(event) => apply("sort", event.target.value)}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    </div>
    <div className={styles.groups}>
      {subjects.length > 1 ? <fieldset className={styles.group}>
        <legend>{subjectLabel}</legend>
        <div className={styles.chips}>
          <button type="button" className={styles.chip} aria-pressed={!activeSubject} disabled={pending} onClick={() => apply("subject", null)}>All designs<span>{subjectTotal}</span></button>
          {shown.map((facet) => chip(facet, "subject", activeSubject))}
          {subjects.length > 8 ? <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className={styles.expand}>{expanded ? "Show fewer" : `Show all ${subjects.length}`}<ChevronDownIcon className={cn("size-3.5", expanded && "rotate-180")} aria-hidden="true" /></button> : null}
        </div>
      </fieldset> : null}
      {formats.length > 1 ? <fieldset className={styles.group}>
        <legend>Print type</legend>
        <div className={styles.chips}>
          <button type="button" className={styles.chip} aria-pressed={!activeFormat} disabled={pending} onClick={() => apply("format", null)}>All types<span>{formatTotal}</span></button>
          {formats.map((facet) => chip(facet, "format", activeFormat))}
        </div>
      </fieldset> : null}
    </div>
  </section>;
}
