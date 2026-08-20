/**
 * The real Litwalls price list and the offers built on top of it.
 *
 * Everything the site says about money is derived from this file. A price
 * quoted in hero copy that disagrees with the product page is the single
 * fastest way to lose a sale at the moment of purchase, so no component may
 * hardcode a rupee figure — it imports from here.
 *
 * IMPORTANT: these are *claims made to customers*. Each one must match a real
 * Shopify variant price and a real Shopify discount. See src/lib/offers.ts
 * for the discount codes that have to exist in Shopify Admin before launch.
 */

export type PriceTier = {
  /** Shown to the customer. Must match the Shopify variant's option value. */
  label: string;
  /** Physical size, spelled out. Removes the "how big is A4 really?" doubt. */
  dimensions: string;
  price: number;
};

export type PriceGroup = {
  id: string;
  title: string;
  /** One line on what this product actually is. */
  blurb: string;
  tiers: PriceTier[];
  /** True when the product only exists as a customer-uploaded print. */
  customOnly: boolean;
};

/**
 * Sizes are listed smallest-first so the entry price leads. The cheapest tier
 * is what the "from ₹X" copy quotes, and it is computed, never retyped.
 */
export const PRICE_GROUPS: PriceGroup[] = [
  {
    id: "poster",
    title: "Posters",
    blurb: "One print, four sizes. The everyday wall poster.",
    customOnly: false,
    tiers: [
      { label: "A5", dimensions: "148 × 210 mm", price: 79 },
      { label: "A4", dimensions: "210 × 297 mm", price: 99 },
      { label: "A3", dimensions: "297 × 420 mm", price: 139 },
      { label: "13″ × 19″", dimensions: "330 × 483 mm", price: 149 },
    ],
  },
  {
    id: "split",
    title: "Split posters",
    blurb: "One image across three panels. Covers a lot more wall.",
    customOnly: false,
    tiers: [
      { label: "A4", dimensions: "3 × (210 × 297 mm)", price: 349 },
      { label: "A3", dimensions: "3 × (297 × 420 mm)", price: 399 },
      { label: "13″ × 19″", dimensions: "3 × (13″ × 19″)", price: 449 },
    ],
  },
  {
    id: "mini",
    title: "Mini pocket prints",
    blurb: "Wallet-sized prints for a desk, a mirror or a phone case.",
    customOnly: true,
    tiers: [
      { label: "Pack of 5", dimensions: "2.5″ × 3.5″", price: 99 },
      { label: "Pack of 10", dimensions: "2.5″ × 3.5″", price: 149 },
    ],
  },
  {
    id: "polaroid",
    title: "Polaroids",
    blurb: "Your photos as polaroid-style prints. Ready to peg up or gift.",
    customOnly: true,
    tiers: [
      { label: "Pack of 5", dimensions: "3.5″ × 4.2″", price: 99 },
      { label: "Pack of 10", dimensions: "3.5″ × 4.2″", price: 149 },
      { label: "Pack of 5 — A6", dimensions: "105 × 148 mm", price: 129 },
      { label: "Pack of 10 — A6", dimensions: "105 × 148 mm", price: 179 },
    ],
  },
];

/** The lowest price anywhere in the catalogue. Quoted as "from ₹79". */
export const ENTRY_PRICE = Math.min(
  ...PRICE_GROUPS.flatMap((group) => group.tiers.map((tier) => tier.price)),
);

export function priceGroup(id: string): PriceGroup | null {
  return PRICE_GROUPS.find((group) => group.id === id) ?? null;
}

/** The cheapest tier in a group — what its "from ₹X" figure quotes. */
export function groupFromPrice(group: PriceGroup): number {
  return Math.min(...group.tiers.map((tier) => tier.price));
}
