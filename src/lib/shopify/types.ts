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
  cost: { totalAmount: Money };
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

export type Cart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
  };
  lines: { nodes: CartLine[] };
};

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

/** The size values offered, in the order Shopify returns them. */
export function sizeOptions(product: Product): string[] {
  const option = product.options.find((o) => o.name === SIZE_OPTION);
  if (option) return option.values;

  // Fall back to reading the variants directly. `options` is a recent addition
  // to the query, and a cached or partial payload should degrade to something
  // usable rather than rendering a product with no sizes at all.
  const seen = new Set<string>();
  for (const variant of product.variants.nodes) {
    const value = variant.selectedOptions.find(
      (o) => o.name === SIZE_OPTION,
    )?.value;
    if (value) seen.add(value);
  }
  return [...seen];
}

/** The variant for a given size, or null if that size is not offered. */
export function variantForSize(
  product: Product,
  size: string,
): ProductVariant | null {
  return (
    product.variants.nodes.find((variant) =>
      variant.selectedOptions.some(
        (option) => option.name === SIZE_OPTION && option.value === size,
      ),
    ) ?? null
  );
}
