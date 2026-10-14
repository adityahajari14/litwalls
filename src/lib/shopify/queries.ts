/**
 * Storefront GraphQL documents.
 *
 * Fragments are kept as bare strings and concatenated per-document so a shared
 * fragment is never defined twice in the same query — GraphQL rejects that.
 *
 * Products here have no options, but the Cart API still takes a variant id as
 * the merchandise id, so every product pulls its first (default) variant.
 */

const MONEY = /* GraphQL */ `
  fragment Money on MoneyV2 {
    amount
    currencyCode
  }
`;

const IMAGE = /* GraphQL */ `
  fragment Image on Image {
    url
    altText
    width
    height
  }
`;

const PRODUCT = /* GraphQL */ `
  fragment Product on Product {
    id
    handle
    title
    description
    descriptionHtml
    availableForSale
    tags
    productType
    vendor
    featuredImage {
      ...Image
    }
    images(first: 10) {
      nodes {
        ...Image
      }
    }
    priceRange {
      minVariantPrice {
        ...Money
      }
      maxVariantPrice {
        ...Money
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        ...Money
      }
    }
    options {
      name
      values
    }
    variants(first: 10) {
      nodes {
        id
        title
        availableForSale
        selectedOptions {
          name
          value
        }
        image {
          ...Image
        }
        price {
          ...Money
        }
        compareAtPrice {
          ...Money
        }
      }
    }
  }
`;

const CART = /* GraphQL */ `
  fragment Cart on Cart {
    id
    checkoutUrl
    totalQuantity
    # The applicable flag is Shopify's verdict, not ours: a code that is
    # expired, not yet started, or whose conditions the cart doesn't meet
    # comes back false. The UI must never claim a discount it hasn't confirmed.
    discountCodes {
      code
      applicable
    }
    cost {
      subtotalAmount {
        ...Money
      }
      totalAmount {
        ...Money
      }
    }
    lines(first: 100) {
      nodes {
        id
        quantity
        cost {
          totalAmount {
            ...Money
          }
          # What the line would cost undiscounted. For a BXGY "free" line this
          # is the full price while totalAmount is zero.
          subtotalAmount {
            ...Money
          }
        }
        # Shopify puts a buy-X-get-Y discount on the LINE, not the cart — and
        # it splits one line into a paid line and a free line to do it. The
        # cart-level discountAllocations field stays empty, so summing these is
        # the only way to know what came off.
        discountAllocations {
          discountedAmount {
            ...Money
          }
        }
        attributes {
          key
          value
        }
        merchandise {
          ... on ProductVariant {
            id
            title
            price {
              ...Money
            }
            product {
              handle
              title
              # The cart drawer needs to tell a split-in-3 set from a single
              # poster to nudge toward the right bundle ladder — the two are
              # counted separately, and nudging a cart of split sets toward
              # the single-poster rung promises a discount it cannot earn.
              tags
              featuredImage {
                ...Image
              }
            }
          }
        }
      }
    }
  }
`;

const productDoc = (operation: string) =>
  [MONEY, IMAGE, PRODUCT, operation].join("\n");

const cartDoc = (operation: string) => [MONEY, IMAGE, CART, operation].join("\n");

export const GET_PRODUCTS = productDoc(/* GraphQL */ `
  query GetProducts(
    $first: Int!
    $query: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
    $after: String
  ) {
    products(
      first: $first
      query: $query
      sortKey: $sortKey
      reverse: $reverse
      after: $after
    ) {
      nodes {
        ...Product
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`);

/**
 * Type-ahead search. Unlike the `products(query:)` filter grammar this is
 * built for half-typed input: it matches prefixes ("ferr" finds Ferrari) and
 * forgives a slipped letter, which is exactly what a results-as-you-type list
 * needs. Capped by Shopify at ten results, so it complements the full search
 * rather than replacing it.
 */
export const PREDICTIVE_SEARCH = productDoc(/* GraphQL */ `
  query PredictiveSearch($query: String!, $limit: Int!) {
    predictiveSearch(
      query: $query
      types: [PRODUCT]
      limit: $limit
      limitScope: EACH
    ) {
      products {
        ...Product
      }
    }
  }
`);

export const GET_PRODUCT_BY_HANDLE = productDoc(/* GraphQL */ `
  query GetProduct($handle: String!) {
    product(handle: $handle) {
      ...Product
    }
  }
`);

export const GET_COLLECTION_PRODUCTS = productDoc(/* GraphQL */ `
  query GetCollectionProducts(
    $handle: String!
    $first: Int!
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $after: String
  ) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      image {
        ...Image
      }
      products(
        first: $first
        sortKey: $sortKey
        reverse: $reverse
        after: $after
      ) {
        nodes {
          ...Product
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`);

/**
 * Kept separate from the Product fragment: `quantityAvailable` needs the
 * `unauthenticated_read_product_inventory` scope, which a store may not have
 * granted. Shopify rejects a GraphQL query in full if any field in it is
 * denied, so isolating this here means a missing scope only degrades the
 * stock-level messaging instead of breaking every page that shows a product.
 */
export const GET_VARIANT_INVENTORY = /* GraphQL */ `
  query GetVariantInventory($id: ID!) {
    node(id: $id) {
      ... on ProductVariant {
        quantityAvailable
      }
    }
  }
`;

/**
 * Stock for several variants at once.
 *
 * A product with four sizes needs four stock numbers, and asking for them one
 * at a time turns a 179-page build into several hundred extra round trips —
 * enough to get connections reset. `nodes` answers in a single request.
 */
export const GET_VARIANTS_INVENTORY = /* GraphQL */ `
  query GetVariantsInventory($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        quantityAvailable
      }
    }
  }
`;

export const GET_PRODUCT_HANDLES = /* GraphQL */ `
  query GetProductHandles($first: Int!) {
    products(first: $first) {
      nodes {
        handle
      }
    }
  }
`;

/**
 * Collections for navigation and the /collections index.
 *
 * Two extra connections ride along, both to answer questions the collection
 * record alone can't:
 *
 *   - `previews` — a few product covers. None of the store's collections has
 *     an image set in admin, so without these every tile was a letter on a
 *     black square. The posters themselves are the better cover anyway.
 *   - `counted` — ids only, to know how many products the storefront can
 *     actually see. A collection whose products are all archived still comes
 *     back from Shopify, and linking to it leads to an empty page.
 */
export const GET_COLLECTIONS = [
  IMAGE,
  /* GraphQL */ `
    query GetCollections($first: Int!) {
      collections(first: $first) {
        nodes {
          id
          handle
          title
          description
          image {
            ...Image
          }
          previews: products(first: 4) {
            nodes {
              featuredImage {
                ...Image
              }
            }
          }
          counted: products(first: 250) {
            nodes {
              id
            }
          }
        }
      }
    }
  `,
].join("\n");

export const CUSTOMER_CREATE = /* GraphQL */ `
  mutation CustomerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export const UPDATE_CART_DISCOUNTS = cartDoc(/* GraphQL */ `
  mutation UpdateCartDiscounts($cartId: ID!, $discountCodes: [String!]!) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ...Cart
      }
      userErrors {
        field
        message
      }
    }
  }
`);

export const GET_CART = cartDoc(/* GraphQL */ `
  query GetCart($id: ID!) {
    cart(id: $id) {
      ...Cart
    }
  }
`);

export const CREATE_CART = cartDoc(/* GraphQL */ `
  mutation CreateCart($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart {
        ...Cart
      }
      userErrors {
        field
        message
      }
    }
  }
`);

export const ADD_CART_LINES = cartDoc(/* GraphQL */ `
  mutation AddCartLines($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...Cart
      }
      userErrors {
        field
        message
      }
    }
  }
`);

export const UPDATE_CART_LINES = cartDoc(/* GraphQL */ `
  mutation UpdateCartLines($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...Cart
      }
      userErrors {
        field
        message
      }
    }
  }
`);

export const REMOVE_CART_LINES = cartDoc(/* GraphQL */ `
  mutation RemoveCartLines($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...Cart
      }
      userErrors {
        field
        message
      }
    }
  }
`);
