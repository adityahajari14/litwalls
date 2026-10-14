import type { CollectionSortKey, ProductSortKey } from "@/lib/shopify/products";

/**
 * The sort options a shopper actually gets, and how each maps onto Shopify.
 *
 * Kept out of the page components because two surfaces render them — the full
 * catalogue and a collection page — against two different Shopify sort-key
 * unions, and the labels must not drift apart between the two.
 *
 * "Featured" leads and is the default. `/products` previously passed no sort
 * key at all, so the main browsing page showed Shopify's arbitrary default
 * ordering and the store's proven sellers landed wherever they happened to
 * fall.
 */
export type SortOption = {
  /** What appears in the URL — short, readable, stable. */
  value: string;
  label: string;
  product: { sortKey: ProductSortKey; reverse?: boolean };
  /** A collection has a curated manual order the global list has no analogue for. */
  collection: { sortKey: CollectionSortKey; reverse?: boolean };
};

export const SORT_OPTIONS: SortOption[] = [
  {
    value: "featured",
    label: "Featured",
    product: { sortKey: "BEST_SELLING" },
    collection: { sortKey: "COLLECTION_DEFAULT" },
  },
  {
    value: "new",
    label: "Newest",
    product: { sortKey: "CREATED_AT", reverse: true },
    collection: { sortKey: "CREATED", reverse: true },
  },
  {
    value: "price-asc",
    label: "Price: low to high",
    product: { sortKey: "PRICE" },
    collection: { sortKey: "PRICE" },
  },
  {
    value: "price-desc",
    label: "Price: high to low",
    product: { sortKey: "PRICE", reverse: true },
    collection: { sortKey: "PRICE", reverse: true },
  },
  {
    value: "title",
    label: "A–Z",
    product: { sortKey: "TITLE" },
    collection: { sortKey: "TITLE" },
  },
];

export const DEFAULT_SORT = SORT_OPTIONS[0];

export function sortOption(value: string | undefined): SortOption {
  return SORT_OPTIONS.find((option) => option.value === value) ?? DEFAULT_SORT;
}

export type PriceBand = {
  value: string;
  label: string;
  min: number;
  /** null means "and above". */
  max: number | null;
};

/**
 * Price bands built from the catalogue's real spread.
 *
 * Hardcoded bands were the wrong shape here: on the live store every standard
 * poster is ₹149, so three of four fixed bands returned nothing and the fourth
 * returned everything — four controls, none of which could change the result.
 *
 * Returns an empty list when there is no spread to divide (one price, or none),
 * and the toolbar then renders no price filter at all. With a real spread it
 * cuts the range into round-numbered thirds.
 */
export function priceBandsFor(min: number, max: number): PriceBand[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [];

  const round = (value: number) => {
    const step = max - min > 600 ? 100 : max - min > 200 ? 50 : 25;
    return Math.round(value / step) * step;
  };

  const first = round(min + (max - min) / 3);
  const second = round(min + (2 * (max - min)) / 3);

  // Rounding can collapse two boundaries onto each other on a narrow range.
  const cuts = [...new Set([first, second])].filter(
    (cut) => cut > min && cut < max,
  );
  if (cuts.length === 0) return [];

  const bands: PriceBand[] = [];
  let lower = 0;

  for (const cut of cuts) {
    bands.push({
      value: `under-${cut}`,
      label: `Under ₹${cut}`,
      min: lower,
      max: cut - 1,
    });
    lower = cut;
  }

  bands.push({
    value: `${lower}-plus`,
    label: `₹${lower} & above`,
    min: lower,
    max: null,
  });

  // Each band restates the one before it as a range rather than "under X",
  // which reads wrong on anything but the first.
  return bands.map((band, index) =>
    index === 0 || band.max === null
      ? band
      : { ...band, label: `₹${band.min} – ₹${band.max}` },
  );
}

export function priceBand(
  value: string | undefined,
  bands: PriceBand[],
): PriceBand | null {
  return bands.find((band) => band.value === value) ?? null;
}

/**
 * Builds the Shopify `query` string for the active filters.
 *
 * Everything is ANDed: a shopper who picked "anime" and "under ₹100" means
 * both, not either. Custom prints are kept out of these grids too, but not
 * here — see getCataloguePage, which filters them from the results because a
 * `-tag:custom` term would also drop ordinary posters tagged "Custom".
 */
export function buildProductQuery({
  size,
  price,
  sizes = [],
  bands = [],
}: {
  size?: string;
  price?: string;
  /** Sizes the catalogue actually offers — anything else is ignored. */
  sizes?: string[];
  bands?: PriceBand[];
}): string | undefined {
  const terms: string[] = [];

  // Only a size the catalogue really has. A value from a stale bookmark would
  // otherwise produce a query that matches nothing and an empty grid with no
  // explanation.
  if (size && sizes.includes(size)) {
    terms.push(`variants.option:"${size}"`);
  }

  const band = priceBand(price, bands);
  if (band) {
    terms.push(
      band.max === null
        ? `variants.price:>=${band.min}`
        : `variants.price:>=${band.min} variants.price:<=${band.max}`,
    );
  }

  return terms.length > 0 ? terms.join(" AND ") : undefined;
}

/** Whether any narrowing filter (not sort) is active. */
export function hasActiveFilters(params: {
  size?: string;
  price?: string;
  sizes?: string[];
  bands?: PriceBand[];
}): boolean {
  return Boolean(
    (params.size && (params.sizes ?? []).includes(params.size)) ||
      priceBand(params.price, params.bands ?? []),
  );
}
