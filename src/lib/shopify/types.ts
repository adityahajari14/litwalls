/** Shapes returned by the Shopify Storefront GraphQL API. */

export type Money = {
  amount: string;
  currencyCode: string;
};

export type Image = {
  url: string;
  altText: string | null;
  width: number;
  height: number;
};

export type SelectedOption = {
  name: string;
  value: string;
};

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  /** e.g. [{ name: "Size", value: "A4" }]. Empty for single-variant products. */
  selectedOptions: SelectedOption[];
  /** Set when a variant carries its own image, as size variants do. */
  image: Image | null;
  price: Money;
  compareAtPrice: Money | null;
};

/** The option name Litwalls Studio uses when publishing size variants. */
export const SIZE_OPTION = "Size";

export type Product = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  availableForSale: boolean;
  tags: string[];
  productType: string;
  vendor: string;
  featuredImage: Image | null;
  images: { nodes: Image[] };
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
  compareAtPriceRange: {
    minVariantPrice: Money;
  };
  /**
   * Options a customer chooses between, e.g. Size with A5/A4/A3/13" × 19".
   * Empty for the older single-variant products, which is why every reader
   * has to cope with both shapes rather than assuming one.
   */
  options: { name: string; values: string[] }[];
  variants: { nodes: ProductVariant[] };
};

export type Collection = {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: Image | null;
};

/**
 * A custom key/value pair carried on a cart line and through to the order.
 * This is how a custom poster's artwork reaches fulfilment: the line item
 * holds a URL to the uploaded file, since Shopify's cart can only store
 * strings, not the image itself. See CUSTOM_ART_ATTRIBUTE.
 */
export type Attribute = {
  key: string;
  value: string;
};

export type CartLine = {
  id: string;
  quantity: number;
  cost: {
    totalAmount: Money;
    /** Undiscounted. On a BXGY free line this is full price while totalAmount is 0. */
    subtotalAmount: Money;
  };
  /** Set by Shopify when a discount hits this line. See cartDiscountTotal. */
  discountAllocations: { discountedAmount: Money }[];
  attributes: Attribute[];
  merchandise: {
    id: string;
    title: string;
    price: Money;
    product: {
      handle: string;
      title: string;
      featuredImage: Image | null;
    };
  };
};

/** A code on the cart, plus Shopify's verdict on whether it actually applies. */
export type CartDiscountCode = {
  code: string;
  /** False for an expired code, or one whose conditions the cart doesn't meet. */
  applicable: boolean;
};

export type Cart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  discountCodes: CartDiscountCode[];
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
  };
  lines: { nodes: CartLine[] };
};

/**
 * What the cart would cost with no discount at all — every line at full price.
 *
 * `cart.cost.subtotalAmount` cannot be used for this: it is already NET of a
 * buy-X-get-Y discount (₹596 for seven ₹149 posters), so showing it above a
 * "you saved" line would subtract the discount twice.
 */
export function cartUndiscountedTotal(cart: Cart): number {
  return cart.lines.nodes.reduce(
    (sum, line) => sum + Number(line.cost.subtotalAmount.amount),
    0,
  );
}

/**
 * Everything Shopify took off, across every kind of discount.
 *
 * Derived as (full price − what Shopify says you owe) rather than by summing
 * allocations, because the two discount classes report themselves in different
 * places and a cart can carry both at once:
 *
 *   - A buy-X-get-Y (product) discount lands on the LINE. Shopify splits the
 *     affected line into a paid one and a free one, and `cost.subtotalAmount`
 *     already reflects it.
 *   - A ₹100-off-order discount lands on the ORDER. No line allocation appears
 *     at all; only `cost.totalAmount` drops.
 *
 * Summing line allocations alone reported ₹0 for an order discount. Verified
 * on the live store 2026-08-20 with seven ₹149 posters: bundle alone → ₹447
 * off; LIT100 alone → ₹100 off; both → ₹547 off, ₹496 to pay.
 */
export function cartDiscountTotal(cart: Cart): number {
  const saving =
    cartUndiscountedTotal(cart) - Number(cart.cost.totalAmount.amount);

  // Never negative: taxes or fees could in principle push totalAmount above
  // the line sum, and a "−₹-40 discount" is worse than showing none.
  return saving > 0 ? saving : 0;
}

/** Every cart mutation returns this same envelope. */
export type CartMutationPayload = {
  cart: Cart | null;
  userErrors: { field: string[] | null; message: string }[];
};

/**
 * The variant to assume when the customer has not chosen one.
 *
 * The cheapest, not merely the first: a product card showing "from ₹299" must
 * agree with the variant a quick-add would actually put in the basket, and
 * Shopify does not guarantee variant order.
 *
 * Lives here rather than in shopify/products.ts because that module is
 * "server-only" (it calls the Storefront API), and this is a plain accessor
 * that client components need too.
 */
export function defaultVariant(product: Product): ProductVariant | null {
  const nodes = product.variants.nodes;
  if (nodes.length === 0) return null;

  return nodes.reduce((cheapest, variant) =>
    Number(variant.price.amount) < Number(cheapest.price.amount)
      ? variant
      : cheapest,
  );
}

/** True when the customer has a real choice to make before adding to cart. */
export function hasSizeChoice(product: Product): boolean {
  return product.variants.nodes.length > 1;
}

/** The values offered for one named option, in the order Shopify returns them. */
export function optionValues(product: Product, optionName: string): string[] {
  const option = product.options.find((o) => o.name === optionName);
  if (option) return option.values;

  // Fall back to reading the variants directly. `options` is a recent addition
  // to the query, and a cached or partial payload should degrade to something
  // usable rather than rendering a product with no choices at all.
  const seen = new Set<string>();
  for (const variant of product.variants.nodes) {
    const value = variant.selectedOptions.find(
      (o) => o.name === optionName,
    )?.value;
    if (value) seen.add(value);
  }
  return [...seen];
}

/** The size values offered, in the order Shopify returns them. */
export function sizeOptions(product: Product): string[] {
  return optionValues(product, SIZE_OPTION);
}

/**
 * The variant matching every given option (name → value), or null if no
 * variant matches. Works for one option (an ordinary size selector) or
 * several at once (e.g. Size + Quantity on a custom-print product) — a
 * variant qualifies only when ALL of its `selectedOptions` for the given
 * names match, so a partial selection deliberately resolves to nothing
 * rather than the first variant that happens to match on one axis.
 */
export function variantForOptions(
  product: Product,
  selections: Record<string, string>,
): ProductVariant | null {
  const entries = Object.entries(selections);
  if (entries.length === 0) return null;

  return (
    product.variants.nodes.find((variant) =>
      entries.every(([name, value]) =>
        variant.selectedOptions.some(
          (option) => option.name === name && option.value === value,
        ),
      ),
    ) ?? null
  );
}

/** The variant for a given size, or null if that size is not offered. */
export function variantForSize(
  product: Product,
  size: string,
): ProductVariant | null {
  return variantForOptions(product, { [SIZE_OPTION]: size });
}
