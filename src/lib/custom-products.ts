import { PRINT_SIZES } from "@/lib/custom-poster";

/**
 * Catalogue of the customer-upload products, and what a customer chooses
 * before uploading.
 *
 * Every entry here is a REAL Shopify product with real variants — the site's
 * one long-standing custom-poster bug was a `sizeId` that only ever changed a
 * display label, never which Shopify variant (and therefore price) actually
 * got added to the cart. This config exists so that never happens again: an
 * axis's `values[].value` must match a real Shopify option value exactly,
 * because `variantForOptions` (src/lib/shopify/types.ts) looks a variant up
 * by that exact string.
 */

export type OptionValue = {
  /** Must equal the Shopify variant option value exactly. */
  value: string;
  /** Shown under the button, e.g. "148 × 210 mm". Display only. */
  detail?: string;
  /** Pixel floor at ~250dpi, only present when this value affects print size. */
  minWidth?: number;
  minHeight?: number;
};

export type OptionAxis = {
  /** Must equal the Shopify product option name exactly ("Size" or "Quantity"). */
  name: string;
  values: OptionValue[];
};

export type CustomProductKind = "poster" | "split" | "retro" | "mini";

export type CustomProductConfig = {
  kind: CustomProductKind;
  handle: string;
  /** Heading shown on the upload page. */
  label: string;
  /** One line under the heading. */
  tagline: string;
  /** The product's real Shopify options, 1 or 2 of them. */
  axes: OptionAxis[];
  /** Which axis's selected value carries the resolution requirement, if any varies it. */
  sizingAxis?: string;
  /** Fixed resolution requirement, for a product whose size never varies (Mini Pocket Prints). */
  fixedResolution?: { minWidth: number; minHeight: number };
  /**
   * The customer uploads ONE image spanning this many panels side by side —
   * only set for the split poster. Widens the resolution requirement instead
   * of checking a single sheet: see `resolutionRequirementFor`.
   */
  splitPanels?: number;
};

const SIZE_AXIS_FROM_PRINT_SIZES: OptionAxis = {
  name: "Size",
  values: PRINT_SIZES.map((size) => ({
    value: size.label,
    detail: size.mm,
    minWidth: size.minWidth,
    minHeight: size.minHeight,
  })),
};

export const CUSTOM_PRODUCTS: CustomProductConfig[] = [
  {
    kind: "poster",
    handle: "custom-poster",
    label: "Custom Poster",
    tagline: "Your image, our paper.",
    axes: [SIZE_AXIS_FROM_PRINT_SIZES],
    sizingAxis: "Size",
  },
  {
    kind: "split",
    handle: "custom-split-poster",
    label: "Custom Split Poster",
    tagline: "One image, split across three panels.",
    splitPanels: 3,
    sizingAxis: "Size",
    axes: [
      {
        name: "Size",
        // No A5 — three 148mm-wide panels is not a poster set. Each panel is
        // a full sheet at the size shown, same as every split product in the
        // catalogue.
        values: PRINT_SIZES.filter((size) => size.id !== "A5").map((size) => ({
          value: size.label,
          detail: `3 × (${size.mm})`,
          minWidth: size.minWidth,
          minHeight: size.minHeight,
        })),
      },
    ],
  },
  {
    kind: "retro",
    handle: "retro-prints",
    label: "Retro Prints",
    tagline: "Your photos, printed retro-print style.",
    sizingAxis: "Size",
    axes: [
      {
        name: "Size",
        values: [
          { value: '3.5" × 4.2"', detail: "89 × 107 mm", minWidth: 875, minHeight: 1050 },
          { value: "A6", detail: "105 × 148 mm", minWidth: 1033, minHeight: 1457 },
        ],
      },
      {
        name: "Quantity",
        values: [{ value: "Set of 5" }, { value: "Set of 10" }],
      },
    ],
  },
  {
    kind: "mini",
    handle: "mini-pocket-prints-pack-of-5",
    label: "Mini Pocket Prints",
    tagline: "Your photos, wallet-sized.",
    // Fixed 2.5" × 3.5" — not a Shopify option, since it never varies.
    fixedResolution: { minWidth: 625, minHeight: 875 },
    axes: [
      {
        name: "Quantity",
        values: [{ value: "Set of 5" }, { value: "Set of 10" }],
      },
    ],
  },
];

export function customProductConfig(handle: string): CustomProductConfig | null {
  return CUSTOM_PRODUCTS.find((product) => product.handle === handle) ?? null;
}

/**
 * Whether a custom product is a single poster — the one custom product that
 * counts on the single-poster bundle ladder alongside the catalogue posters.
 * Seven custom posters earn "buy 4, get 3 free" exactly as seven catalogue
 * ones do, or any mix of the two. The split poster has its own ladder, and
 * mini and retro prints are packs of small prints, not posters.
 *
 * `scripts/sync-discounts.mjs` reads the same `kind: "poster"` entries to
 * scope the Shopify discounts, so the two cannot disagree.
 */
export function isCustomSinglePoster(handle: string): boolean {
  return customProductConfig(handle)?.kind === "poster";
}

/**
 * The pixel floor for the customer's current selections, or null when this
 * product has neither a sizing axis nor a fixed one (never happens today,
 * but a config without either is a config with no resolution check).
 *
 * A split product's requirement is widened rather than taken as-is: the
 * customer uploads one image spanning `splitPanels` panels side by side, so
 * the short edge must cover all of them while the long edge stays a single
 * panel's. `resolutionFor` (custom-poster.ts) is orientation-agnostic, so
 * which field below is named min-width vs min-height doesn't matter — only
 * the pair of numbers does.
 */
export function resolutionRequirementFor(
  config: CustomProductConfig,
  selections: Record<string, string>,
): { minWidth: number; minHeight: number } | null {
  let base: { minWidth: number; minHeight: number } | null = null;

  if (config.fixedResolution) {
    base = config.fixedResolution;
  } else if (config.sizingAxis) {
    const axis = config.axes.find((a) => a.name === config.sizingAxis);
    const value = axis?.values.find((v) => v.value === selections[config.sizingAxis!]);
    if (value?.minWidth && value?.minHeight) {
      base = { minWidth: value.minWidth, minHeight: value.minHeight };
    }
  }

  if (!base) return null;
  if (!config.splitPanels) return base;

  const panelLong = Math.max(base.minWidth, base.minHeight);
  const panelShort = Math.min(base.minWidth, base.minHeight);
  return { minWidth: panelLong, minHeight: panelShort * config.splitPanels };
}

/**
 * The shape the print will actually be, in display orientation.
 *
 * `resolutionRequirementFor` above is deliberately orientation-agnostic — it
 * only cares whether an image has enough pixels — but the upload preview has
 * to show the customer the real frame, so this one is not.
 *
 * Posters are portrait. A split product is `splitPanels` portrait panels hung
 * side by side, so the whole piece is that many times as wide as one panel and
 * one panel tall — a landscape frame, which is precisely the thing a customer
 * uploading a portrait photo needs to see before they pay.
 *
 * Returns null when the size is unknown, and the preview falls back to its
 * default frame rather than inventing a crop.
 */
export function printAspectFor(
  config: CustomProductConfig,
  selections: Record<string, string>,
): { width: number; height: number } | null {
  const requirement = resolutionRequirementFor(config, selections);
  if (!requirement) return null;

  const long = Math.max(requirement.minWidth, requirement.minHeight);
  const short = Math.min(requirement.minWidth, requirement.minHeight);

  // A split requirement is already "one panel's long edge × the short edge
  // times the panel count", so its longer number is the full width of the
  // hung piece and its shorter one is the height — landscape. A single poster
  // is the other way round: portrait, short edge across.
  return config.splitPanels
    ? { width: long, height: short }
    : { width: short, height: long };
}

/** True once every axis has a selection. */
export function selectionsComplete(
  config: CustomProductConfig,
  selections: Record<string, string>,
): boolean {
  return config.axes.every((axis) => Boolean(selections[axis.name]));
}
