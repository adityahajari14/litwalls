import "server-only";

import { storefront } from "@/lib/shopify/client";

/**
 * Our catalogue, in the shape Shiprocket Checkout pulls it in.
 *
 * Fastrr keeps its own copy of the catalogue — it is where the checkout gets
 * product names, images and weights from — and fills it by calling three
 * endpoints on our side (/api/fastrr/products, /collections and
 * /collection-products). The shape is theirs; it is modelled on Shopify's REST
 * product, which is why the field names look familiar.
 *
 * Read from the Storefront API rather than Admin on purpose: Storefront only
 * returns what is published to this storefront, which is exactly the set of
 * things a shopper can put in a cart here.
 *
 * Their guide: "Each and every field is mandatory. If no value exists, then a
 * blank string needs to be passed." Hence the `?? ""` throughout.
 */

/** Short: a price change should not take long to reach the checkout. */
const CATALOG_REVALIDATE = 60 * 5;

/** Shopify's ceiling for one page is 250; 50 keeps each response small. */
const PAGE_SIZE = 50;

/**
 * Stock to report for something Shopify will sell regardless of count.
 *
 * Posters are printed to order, so Shopify holds them at 0 with "continue
 * selling" on — `availableForSale: true, quantityAvailable: 0`. Passing that 0
 * through would tell the checkout every poster is out of stock.
 */
const UNTRACKED_STOCK = 9999;

export type FastrrCatalogVariant = {
  id: number;
  title: string;
  price: string;
  compare_at_price: string;
  sku: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  taxable: boolean;
  option_values: Record<string, string>;
  grams: number;
  image: { src: string };
  weight: number;
  weight_unit: string;
};

export type FastrrCatalogProduct = {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  handle: string;
  updated_at: string;
  tags: string;
  status: string;
  variants: FastrrCatalogVariant[];
  image: { src: string };
  options: { name: string; values: string[] }[];
};

export type FastrrCatalogCollection = {
  id: number;
  updated_at: string;
  body_html: string;
  handle: string;
  image: { src: string };
  title: string;
  created_at: string;
};

/** `gid://shopify/Product/123` → 123. Their ids must be numeric ("long"). */
export function numericId(gid: string): number {
  return Number(gid.split("/").pop());
}

/** "199.0" → "199.00", the two-decimal string their samples use. */
function money(amount: string | undefined | null): string {
  return amount ? Number(amount).toFixed(2) : "";
}

const WEIGHT_UNITS: Record<string, { unit: string; grams: number }> = {
  KILOGRAMS: { unit: "kg", grams: 1000 },
  GRAMS: { unit: "g", grams: 1 },
  POUNDS: { unit: "lb", grams: 453.592 },
  OUNCES: { unit: "oz", grams: 28.3495 },
};

type StorefrontVariant = {
  id: string;
  title: string;
  sku: string | null;
  taxable: boolean;
  availableForSale: boolean;
  quantityAvailable: number | null;
  weight: number | null;
  weightUnit: string;
  price: { amount: string };
  compareAtPrice: { amount: string } | null;
  image: { url: string } | null;
  selectedOptions: { name: string; value: string }[];
};

type StorefrontProduct = {
  id: string;
  title: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  createdAt: string;
  updatedAt: string;
  handle: string;
  tags: string[];
  featuredImage: { url: string } | null;
  options: { name: string; values: string[] }[];
  variants: { nodes: StorefrontVariant[] };
};

type StorefrontCollection = {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  updatedAt: string;
  image: { url: string } | null;
};

function toVariant(
  variant: StorefrontVariant,
  product: StorefrontProduct,
): FastrrCatalogVariant {
  const weight = variant.weight ?? 0;
  const unit = WEIGHT_UNITS[variant.weightUnit] ?? WEIGHT_UNITS.KILOGRAMS;
  const stock = variant.quantityAvailable ?? 0;

  return {
    id: numericId(variant.id),
    title: variant.title,
    price: money(variant.price.amount),
    compare_at_price: money(variant.compareAtPrice?.amount),
    sku: variant.sku ?? "",
    quantity: !variant.availableForSale ? 0 : stock > 0 ? stock : UNTRACKED_STOCK,
    // Storefront has no per-variant timestamps; the product's are the closest
    // true statement about when this variant last changed.
    created_at: product.createdAt,
    updated_at: product.updatedAt,
    taxable: variant.taxable,
    option_values: Object.fromEntries(
      variant.selectedOptions.map((option) => [option.name, option.value]),
    ),
    grams: Math.round(weight * unit.grams),
    image: { src: variant.image?.url ?? product.featuredImage?.url ?? "" },
    weight,
    weight_unit: unit.unit,
  };
}

function toProduct(product: StorefrontProduct): FastrrCatalogProduct {
  return {
    id: numericId(product.id),
    title: product.title,
    body_html: product.descriptionHtml ?? "",
    vendor: product.vendor ?? "",
    product_type: product.productType ?? "",
    created_at: product.createdAt,
    handle: product.handle,
    updated_at: product.updatedAt,
    tags: product.tags.join(", "),
    // Storefront never returns a draft or archived product, so anything that
    // reaches this function is on sale.
    status: "active",
    variants: product.variants.nodes.map((variant) => toVariant(variant, product)),
    image: { src: product.featuredImage?.url ?? "" },
    options: product.options.map(({ name, values }) => ({ name, values })),
  };
}

function toCollection(collection: StorefrontCollection): FastrrCatalogCollection {
  return {
    id: numericId(collection.id),
    updated_at: collection.updatedAt,
    body_html: collection.descriptionHtml ?? "",
    handle: collection.handle,
    image: { src: collection.image?.url ?? "" },
    title: collection.title,
    // Storefront does not expose when a collection was created.
    created_at: collection.updatedAt,
  };
}

// `quantityAvailable` needs the unauthenticated_read_product_inventory scope
// (see GET_VARIANT_INVENTORY). This store's token has it; a token without it
// would fail these queries outright rather than quietly report no stock.
const CATALOG_PRODUCT = /* GraphQL */ `
  fragment CatalogProduct on Product {
    id
    title
    descriptionHtml
    vendor
    productType
    createdAt
    updatedAt
    handle
    tags
    featuredImage {
      url
    }
    options {
      name
      values
    }
    variants(first: 100) {
      nodes {
        id
        title
        sku
        taxable
        availableForSale
        quantityAvailable
        weight
        weightUnit
        price {
          amount
        }
        compareAtPrice {
          amount
        }
        image {
          url
        }
        selectedOptions {
          name
          value
        }
      }
    }
  }
`;

const CATALOG_PRODUCTS = [
  CATALOG_PRODUCT,
  /* GraphQL */ `
    query CatalogProducts($first: Int!, $after: String) {
      products(first: $first, after: $after) {
        nodes {
          ...CatalogProduct
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,
].join("\n");

const CATALOG_COLLECTION_PRODUCTS = [
  CATALOG_PRODUCT,
  /* GraphQL */ `
    query CatalogCollectionProducts($id: ID!, $first: Int!, $after: String) {
      collection(id: $id) {
        products(first: $first, after: $after) {
          nodes {
            ...CatalogProduct
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `,
].join("\n");

const CATALOG_COLLECTIONS = /* GraphQL */ `
  query CatalogCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      nodes {
        id
        handle
        title
        descriptionHtml
        updatedAt
        image {
          url
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

type Connection<T> = {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

/**
 * Walks a cursor-paginated connection to its end.
 *
 * Their endpoints page by number and need a `total`; Shopify pages by cursor
 * and offers neither. Reading everything and slicing is the honest bridge
 * between the two at this catalogue's size, and each cursor page is cached, so
 * a full Fastrr sync costs Shopify a handful of requests at most.
 */
async function all<T>(
  fetchPage: (after: string | null) => Promise<Connection<T> | null>,
): Promise<T[]> {
  const nodes: T[] = [];
  let after: string | null = null;

  // Bounded so a cursor that never ends cannot spin forever: 200 pages of 50
  // is ten thousand products, far past anything this store will hold.
  for (let page = 0; page < 200; page++) {
    const connection = await fetchPage(after);
    if (!connection) break;

    nodes.push(...connection.nodes);
    if (!connection.pageInfo.hasNextPage || !connection.pageInfo.endCursor) break;
    after = connection.pageInfo.endCursor;
  }

  return nodes;
}

export async function getCatalogProducts(): Promise<FastrrCatalogProduct[]> {
  const products = await all<StorefrontProduct>(async (after) => {
    const data = await storefront<{ products: Connection<StorefrontProduct> }>(
      CATALOG_PRODUCTS,
      {
        variables: { first: PAGE_SIZE, after },
        revalidate: CATALOG_REVALIDATE,
        tags: ["products"],
      },
    );
    return data.products;
  });

  return products.map(toProduct);
}

export async function getCatalogCollections(): Promise<FastrrCatalogCollection[]> {
  const collections = await all<StorefrontCollection>(async (after) => {
    const data = await storefront<{
      collections: Connection<StorefrontCollection>;
    }>(CATALOG_COLLECTIONS, {
      variables: { first: PAGE_SIZE, after },
      revalidate: CATALOG_REVALIDATE,
      tags: ["collections"],
    });
    return data.collections;
  });

  return collections.map(toCollection);
}

/** Null when no such collection is published here — the route answers 404. */
export async function getCatalogCollectionProducts(
  collectionId: number,
): Promise<FastrrCatalogProduct[] | null> {
  let found = false;

  const products = await all<StorefrontProduct>(async (after) => {
    const data = await storefront<{
      collection: { products: Connection<StorefrontProduct> } | null;
    }>(CATALOG_COLLECTION_PRODUCTS, {
      variables: {
        id: `gid://shopify/Collection/${collectionId}`,
        first: PAGE_SIZE,
        after,
      },
      revalidate: CATALOG_REVALIDATE,
      tags: ["products", "collections"],
    });

    if (data.collection) found = true;
    return data.collection?.products ?? null;
  });

  return found ? products.map(toProduct) : null;
}

/**
 * `?page=1&limit=100`, as their sync sends it. Pages are 1-based in their
 * examples; a 0 is treated as the first page rather than as an error, since a
 * sync that silently fetches nothing is worse than one that is forgiven.
 */
export function paginate<T>(items: T[], request: Request): T[] {
  const params = new URL(request.url).searchParams;

  const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
  const limit = Math.min(
    250,
    Math.max(1, Math.floor(Number(params.get("limit")) || 100)),
  );

  return items.slice((page - 1) * limit, page * limit);
}

/* ---------------------------------------------- from Shopify webhooks */

/**
 * A product as Shopify's `products/create` and `products/update` webhooks
 * send it. Every field is optional because webhook payloads thin out across
 * API versions, and a missing weight must not stop a price change syncing.
 */
export type ShopifyWebhookProduct = {
  id: number;
  title?: string;
  body_html?: string | null;
  vendor?: string | null;
  product_type?: string | null;
  created_at?: string;
  handle?: string;
  updated_at?: string;
  tags?: string | null;
  status?: string;
  image?: { src?: string } | null;
  images?: { id: number; src?: string }[];
  options?: { name: string; values: string[] }[];
  variants?: {
    id: number;
    title?: string;
    price?: string;
    compare_at_price?: string | null;
    sku?: string | null;
    inventory_quantity?: number | null;
    inventory_management?: string | null;
    inventory_policy?: string | null;
    created_at?: string;
    updated_at?: string;
    taxable?: boolean;
    grams?: number | null;
    weight?: number | null;
    weight_unit?: string | null;
    image_id?: number | null;
    option1?: string | null;
    option2?: string | null;
    option3?: string | null;
  }[];
};

export type ShopifyWebhookCollection = {
  id: number;
  handle?: string;
  title?: string;
  body_html?: string | null;
  updated_at?: string;
  published_at?: string | null;
  image?: { src?: string } | null;
};

/**
 * Shopify's webhook product → Fastrr's. Mapped straight from the payload
 * rather than by re-reading the product, so what is pushed is exactly the
 * change Shopify just announced, with no cache in between.
 */
export function fromShopifyWebhookProduct(
  product: ShopifyWebhookProduct,
): FastrrCatalogProduct {
  const image = product.image?.src ?? "";
  const options = product.options ?? [];
  const now = new Date().toISOString();

  return {
    id: product.id,
    title: product.title ?? "",
    body_html: product.body_html ?? "",
    vendor: product.vendor ?? "",
    product_type: product.product_type ?? "",
    created_at: product.created_at ?? now,
    handle: product.handle ?? "",
    updated_at: product.updated_at ?? now,
    tags: product.tags ?? "",
    // Passed through, so archiving a product in Shopify retires it there too.
    status: product.status ?? "active",
    variants: (product.variants ?? []).map((variant) => {
      const stock = variant.inventory_quantity ?? 0;
      // Untracked, or tracked but allowed to oversell: see UNTRACKED_STOCK.
      const unlimited =
        !variant.inventory_management || variant.inventory_policy === "continue";
      const values = [variant.option1, variant.option2, variant.option3];

      return {
        id: variant.id,
        title: variant.title ?? "",
        price: money(variant.price),
        compare_at_price: money(variant.compare_at_price),
        sku: variant.sku ?? "",
        quantity: stock > 0 ? stock : unlimited ? UNTRACKED_STOCK : 0,
        created_at: variant.created_at ?? product.created_at ?? now,
        updated_at: variant.updated_at ?? product.updated_at ?? now,
        taxable: variant.taxable ?? true,
        option_values: Object.fromEntries(
          options.flatMap((option, index) => {
            const value = values[index];
            return value ? [[option.name, value]] : [];
          }),
        ),
        grams: variant.grams ?? 0,
        image: {
          src:
            product.images?.find((entry) => entry.id === variant.image_id)?.src ??
            image,
        },
        weight: variant.weight ?? 0,
        weight_unit: variant.weight_unit ?? "kg",
      };
    }),
    image: { src: image },
    options: options.map(({ name, values }) => ({ name, values })),
  };
}

export function fromShopifyWebhookCollection(
  collection: ShopifyWebhookCollection,
): FastrrCatalogCollection {
  const updated = collection.updated_at ?? new Date().toISOString();

  return {
    id: collection.id,
    updated_at: updated,
    body_html: collection.body_html ?? "",
    handle: collection.handle ?? "",
    image: { src: collection.image?.src ?? "" },
    title: collection.title ?? "",
    created_at: collection.published_at ?? updated,
  };
}
