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

/** True once every axis has a selection. */
export function selectionsComplete(
  config: CustomProductConfig,
  selections: Record<string, string>,
): boolean {
  return config.axes.every((axis) => Boolean(selections[axis.name]));
}
