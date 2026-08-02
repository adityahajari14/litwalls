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

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: Money;
  compareAtPrice: Money | null;
};

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
  /** Products have no options, so this holds exactly the default variant. */
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
 * The default (and only) variant — what the Cart API needs as merchandise id.
 *
 * Lives here rather than in shopify/products.ts because that module is
 * "server-only" (it calls the Storefront API), and this is a plain accessor
 * that client components need too — e.g. a product card's quick-add button.
 */
export function defaultVariant(product: Product) {
  return product.variants.nodes[0] ?? null;
}
