/**
 * Brings the Shopify discounts in line with what the storefront advertises.
 *
 *   node scripts/sync-discounts.mjs            # report only — changes nothing
 *   node scripts/sync-discounts.mjs --apply    # make the changes
 *
 * Why this exists: the bundle codes were created scoped to the collections the
 * store had on the day (Marvel, Movies, Music, DC). A buy-X-get-Y discount
 * cannot target "all products", so that list has to be kept up by hand — and
 * when the catalogue moved to Cars and F1 nobody did, so the codes silently
 * stopped covering almost everything on sale. The storefront kept applying
 * them and Shopify kept answering "not applicable". Re-run this whenever a
 * collection is added.
 *
 * What it sets up (codes and thresholds are read from src/lib/offers.ts, so
 * this can't drift from what the site promises):
 *
 *   1. Single-poster bundles (BUY4GET3FREE …) — buy and get sides scoped to
 *      every poster collection, plus a small unpublished collection holding
 *      the custom poster. Custom posters earn the same bundles as catalogue
 *      ones, but a buy-X-get-Y can be scoped to collections OR products, not
 *      both — and the existing custom-prints collection also holds the mini
 *      and retro print packs, which are not posters. Hence a collection of
 *      its own; it is never published to a sales channel, so shoppers never
 *      see it.
 *   2. Split-set bundles (SPLITBUY1GET2FREE …) — scoped to the products tagged
 *      exactly `split`. They were scoped to the ordinary poster collections,
 *      which made SPLITBUY1GET2FREE a "buy 1 poster, get 2 free" code for
 *      anyone who typed it.
 *   3. The free gift — an AUTOMATIC buy-X-get-Y: spend the gift threshold, get
 *      one of the gift packs free. The storefront adds the gift line itself;
 *      only this discount can make it cost nothing.
 *
 * Needs SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN (with
 * read/write_discounts and read_products) in .env.local.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const API_VERSION = "2025-01";

/** Collections that are not poster ranges and must never earn a bundle. */
const NON_POSTER_COLLECTIONS = new Set(["custom-prints"]);

/** Holds the custom single poster(s) so the bundle codes can reach them. */
const CUSTOM_BUNDLE_COLLECTION = {
  handle: "bundle-custom-posters",
  title: "Bundle eligible — custom posters (used by discounts, do not delete)",
};

const GIFT_TITLE = "Free gift over threshold (storefront adds the line)";

/* ------------------------------------------------------------------ config */

function readEnv() {
  const file = path.join(ROOT, ".env.local");
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const at = line.indexOf("=");
    env[line.slice(0, at).trim()] = line
      .slice(at + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return env;
}

/** Pulls the offer definitions out of offers.ts rather than repeating them. */
function readOffers() {
  const source = fs.readFileSync(path.join(ROOT, "src/lib/offers.ts"), "utf8");

  const block = (name) => {
    const match = source.match(
      new RegExp(`export const ${name}[^=]*=\\s*\\[([\\s\\S]*?)\\n\\];`),
    );
    if (!match) throw new Error(`Could not find ${name} in offers.ts`);
    return match[1];
  };

  const bundles = (name) =>
    [...block(name).matchAll(/pay:\s*(\d+),\s*total:\s*(\d+),\s*code:\s*"([^"]+)"/g)].map(
      ([, pay, total, code]) => ({ pay: Number(pay), total: Number(total), code }),
    );

  const threshold = source.match(/export const GIFT_THRESHOLD = (\d+);/);
  if (!threshold) throw new Error("Could not find GIFT_THRESHOLD in offers.ts");

  // The custom products that are single posters — `kind: "poster"` in
  // custom-products.ts, the same test the cart uses (isCustomSinglePoster).
  const customSource = fs.readFileSync(
    path.join(ROOT, "src/lib/custom-products.ts"),
    "utf8",
  );
  const customPosterHandles = [
    ...customSource.matchAll(/kind:\s*"poster",\s*handle:\s*"([^"]+)"/g),
  ].map(([, handle]) => handle);

  return {
    customPosterHandles,
    single: bundles("SINGLE_BUNDLES"),
    split: bundles("SPLIT_BUNDLES"),
    giftThreshold: Number(threshold[1]),
    giftHandles: [...block("GIFT_OPTIONS").matchAll(/handle:\s*"([^"]+)"/g)].map(
      ([, handle]) => handle,
    ),
  };
}

const env = readEnv();
const origin = (
  /^https?:\/\//.test(env.SHOPIFY_STORE_DOMAIN)
    ? env.SHOPIFY_STORE_DOMAIN
    : `https://${env.SHOPIFY_STORE_DOMAIN}`
).replace(/\/$/, "");

async function admin(query, variables) {
  const response = await fetch(`${origin}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message).join("; "));
  }
  return body.data;
}

/* -------------------------------------------------------------------- read */

const ITEMS = `
  __typename
  ... on DiscountCollections { collections(first: 100) { nodes { id handle } } }
  ... on DiscountProducts {
    products(first: 100) { nodes { id handle } }
    productVariants(first: 100) { nodes { id } }
  }
`;

const state = await admin(`{
  collections(first: 100) {
    nodes { id handle title products(first: 50) { nodes { id handle } } }
  }
  split: products(first: 100, query: "tag:split") { nodes { id handle tags status } }
  discountNodes(first: 100) {
    nodes {
      id
      discount {
        __typename
        ... on DiscountCodeBxgy {
          title
          codes(first: 5) { nodes { code } }
          customerBuys { items { ${ITEMS} } }
          customerGets { items { ${ITEMS} } }
        }
        ... on DiscountAutomaticBxgy {
          title
          status
          customerBuys { items { ${ITEMS} } }
          customerGets { items { ${ITEMS} } }
        }
      }
    }
  }
}`);

const offers = readOffers();

// Everything that isn't the custom-print range earns the single-poster
// bundles — which, once it exists, includes the custom-poster collection.
const posterCollections = state.collections.nodes.filter(
  (collection) => !NON_POSTER_COLLECTIONS.has(collection.handle),
);

let customBundleCollection = state.collections.nodes.find(
  (collection) => collection.handle === CUSTOM_BUNDLE_COLLECTION.handle,
);

const customPosters = offers.customPosterHandles.length
  ? (
      await admin(
        `query($query: String!) {
          products(first: 10, query: $query) { nodes { id handle status } }
        }`,
        {
          query: offers.customPosterHandles
            .map((handle) => `handle:${handle}`)
            .join(" OR "),
        },
      )
    ).products.nodes.filter(
      (product) =>
        offers.customPosterHandles.includes(product.handle) &&
        product.status === "ACTIVE",
    )
  : [];

// Shopify's tag search ignores case, and ordinary posters carry a descriptive
// "Split" tag. Only the exact lowercase marker means a split-in-3 set.
const splitProducts = state.split.nodes.filter(
  (product) => product.tags.includes("split") && product.status === "ACTIVE",
);

const byCode = new Map();
for (const node of state.discountNodes.nodes) {
  if (node.discount.__typename !== "DiscountCodeBxgy") continue;
  for (const { code } of node.discount.codes.nodes) byCode.set(code, node);
}

const ids = (items, key) => (items?.[key]?.nodes ?? []).map((node) => node.id);
const handles = (items, key) =>
  (items?.[key]?.nodes ?? []).map((node) => node.handle).sort().join(", ") || "—";

/* -------------------------------------------------------------------- plan */

/** @type {{ label: string, run: () => Promise<unknown> }[]} */
const plan = [];

function sameSet(a, b) {
  return a.length === b.length && a.every((value) => b.includes(value));
}

/**
 * The `items` input that moves one side of a discount onto exactly `wanted`,
 * or null when it is already there.
 */
function itemsInput(current, kind, wanted) {
  const haveCollections = ids(current, "collections");
  const haveProducts = ids(current, "products");

  if (kind === "collections") {
    if (sameSet(haveCollections, wanted) && haveProducts.length === 0) return null;
    return {
      collections: {
        add: wanted.filter((id) => !haveCollections.includes(id)),
        remove: haveCollections.filter((id) => !wanted.includes(id)),
      },
      ...(haveProducts.length ? { products: { productsToRemove: haveProducts } } : {}),
    };
  }

  if (sameSet(haveProducts, wanted) && haveCollections.length === 0) return null;
  return {
    products: {
      productsToAdd: wanted.filter((id) => !haveProducts.includes(id)),
      productsToRemove: haveProducts.filter((id) => !wanted.includes(id)),
    },
    ...(haveCollections.length ? { collections: { remove: haveCollections } } : {}),
  };
}

/**
 * @param getWanted Called again when the step runs, not just while planning:
 *   the custom-poster collection may not exist until an earlier step has
 *   created it, and its real id is only known then.
 */
function planBundle(bundle, kind, getWanted, wantedLabel) {
  const node = byCode.get(bundle.code);
  if (!node) {
    console.log(`  ✗ ${bundle.code} — does not exist in Shopify. Create it in admin first.`);
    return;
  }

  const inputs = () => ({
    buys: itemsInput(node.discount.customerBuys.items, kind, getWanted()),
    gets: itemsInput(node.discount.customerGets.items, kind, getWanted()),
  });
  const { buys, gets } = inputs();

  if (!buys && !gets) {
    console.log(`  ✓ ${bundle.code} — already scoped to ${wantedLabel}`);
    return;
  }

  const was =
    handles(node.discount.customerBuys.items, "collections") !== "—"
      ? `collections: ${handles(node.discount.customerBuys.items, "collections")}`
      : `products: ${handles(node.discount.customerBuys.items, "products")}`;
  console.log(`  → ${bundle.code}\n      now:  ${was}\n      want: ${wantedLabel}`);

  plan.push({
    label: `re-scope ${bundle.code}`,
    run: async () => {
      const { buys, gets } = inputs();
      const data = await admin(
        `mutation($id: ID!, $input: DiscountCodeBxgyInput!) {
          discountCodeBxgyUpdate(id: $id, bxgyCodeDiscount: $input) {
            userErrors { field message }
          }
        }`,
        {
          id: node.id,
          input: {
            ...(buys ? { customerBuys: { items: buys } } : {}),
            ...(gets ? { customerGets: { items: gets } } : {}),
          },
        },
      );
      const errors = data.discountCodeBxgyUpdate.userErrors;
      if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
    },
  });
}

console.log(`\nStore: ${origin}`);
console.log(APPLY ? "Mode:  APPLY\n" : "Mode:  dry run (pass --apply to change anything)\n");

console.log("Custom posters in the single-poster bundles");
/** Stands in for the collection's id until the step that creates it has run. */
const PENDING = "(to be created)";

if (customPosters.length === 0) {
  console.log("  ✗ No active custom poster product found — bundles will cover catalogue posters only.");
} else if (!customBundleCollection) {
  console.log(
    `  → create unpublished collection "${CUSTOM_BUNDLE_COLLECTION.handle}" holding: ` +
      customPosters.map((product) => product.handle).join(", "),
  );
  plan.push({
    label: `create collection ${CUSTOM_BUNDLE_COLLECTION.handle}`,
    run: async () => {
      const data = await admin(
        `mutation($input: CollectionInput!) {
          collectionCreate(input: $input) {
            collection { id handle }
            userErrors { field message }
          }
        }`,
        {
          input: {
            title: CUSTOM_BUNDLE_COLLECTION.title,
            handle: CUSTOM_BUNDLE_COLLECTION.handle,
            products: customPosters.map((product) => product.id),
          },
        },
      );
      const errors = data.collectionCreate.userErrors;
      if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
      customBundleCollection = data.collectionCreate.collection;
    },
  });
} else {
  const inCollection = customBundleCollection.products.nodes.map((p) => p.id);
  const missing = customPosters.filter((p) => !inCollection.includes(p.id));
  if (missing.length === 0) {
    console.log(`  ✓ ${CUSTOM_BUNDLE_COLLECTION.handle} — holds ${customPosters.map((p) => p.handle).join(", ")}`);
  } else {
    console.log(`  → add to ${CUSTOM_BUNDLE_COLLECTION.handle}: ${missing.map((p) => p.handle).join(", ")}`);
    plan.push({
      label: `add custom posters to ${CUSTOM_BUNDLE_COLLECTION.handle}`,
      run: async () => {
        const data = await admin(
          `mutation($id: ID!, $productIds: [ID!]!) {
            collectionAddProducts(id: $id, productIds: $productIds) {
              userErrors { field message }
            }
          }`,
          { id: customBundleCollection.id, productIds: missing.map((p) => p.id) },
        );
        const errors = data.collectionAddProducts.userErrors;
        if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
      },
    });
  }
}

console.log("\nSingle-poster bundles");
const wantsCustom = customPosters.length > 0;
const singleScope = () => {
  const ids = posterCollections.map((collection) => collection.id);
  // Already in posterCollections when it existed at the start of this run.
  if (wantsCustom && !ids.includes(customBundleCollection?.id ?? PENDING)) {
    ids.push(customBundleCollection?.id ?? PENDING);
  }
  return ids;
};
const posterLabel = `collections: ${[
  ...new Set([
    ...posterCollections.map((c) => c.handle),
    ...(wantsCustom ? [CUSTOM_BUNDLE_COLLECTION.handle] : []),
  ]),
]
  .sort()
  .join(", ")}`;
for (const bundle of offers.single) {
  planBundle(bundle, "collections", singleScope, posterLabel);
}

console.log("\nSplit-set bundles");
if (splitProducts.length === 0) {
  console.log("  ✗ No active product is tagged exactly `split` — nothing to scope these to.");
} else {
  const splitLabel = `products: ${splitProducts.map((p) => p.handle).sort().join(", ")}`;
  for (const bundle of offers.split) {
    planBundle(bundle, "products", () => splitProducts.map((p) => p.id), splitLabel);
  }
}

console.log("\nFree gift");
const existingGift = state.discountNodes.nodes.find(
  (node) => node.discount.__typename === "DiscountAutomaticBxgy",
);

if (existingGift) {
  console.log(
    `  ✓ An automatic buy-X-get-Y already exists ("${existingGift.discount.title}", ${existingGift.discount.status}). Left alone.`,
  );
} else {
  // The variant a customer actually receives: the cheapest of each gift
  // product, which is what `defaultVariant` picks on the storefront.
  const gifts = await admin(
    `query($query: String!) {
      products(first: 10, query: $query) {
        nodes { handle status variants(first: 20) { nodes { id title price } } }
      }
    }`,
    { query: offers.giftHandles.map((handle) => `handle:${handle}`).join(" OR ") },
  );

  const variants = gifts.products.nodes
    .filter((product) => offers.giftHandles.includes(product.handle))
    .map((product) => {
      const cheapest = product.variants.nodes.reduce((low, variant) =>
        Number(variant.price) < Number(low.price) ? variant : low,
      );
      return { handle: product.handle, ...cheapest };
    });

  const missing = offers.giftHandles.filter(
    (handle) => !variants.some((variant) => variant.handle === handle),
  );

  if (variants.length === 0) {
    console.log("  ✗ None of the gift products exist — cannot create the discount.");
  } else {
    // Every real range, custom prints included: anything the customer buys
    // counts toward the threshold. The discount-plumbing collection is left
    // out — its one product is already in custom-prints.
    const buyCollections = state.collections.nodes.filter(
      (collection) => collection.handle !== CUSTOM_BUNDLE_COLLECTION.handle,
    );
    console.log(
      `  → create automatic discount: spend ₹${offers.giftThreshold} across ` +
        `${buyCollections.map((c) => c.handle).sort().join(", ")} → 1 free of:`,
    );
    for (const variant of variants) {
      console.log(`      ${variant.handle} — ${variant.title} (₹${variant.price})`);
    }
    if (missing.length) console.log(`      (not found, skipped: ${missing.join(", ")})`);

    plan.push({
      label: "create the automatic free-gift discount",
      run: async () => {
        const data = await admin(
          `mutation($input: DiscountAutomaticBxgyInput!) {
            discountAutomaticBxgyCreate(automaticBxgyDiscount: $input) {
              automaticDiscountNode { id }
              userErrors { field message }
            }
          }`,
          {
            input: {
              title: GIFT_TITLE,
              startsAt: new Date().toISOString(),
              // A String here, though the code-discount input takes an Int.
              usesPerOrderLimit: "1",
              combinesWith: {
                orderDiscounts: true,
                productDiscounts: false,
                shippingDiscounts: true,
              },
              customerBuys: {
                value: { amount: offers.giftThreshold.toFixed(2) },
                items: { collections: { add: buyCollections.map((c) => c.id) } },
              },
              customerGets: {
                value: {
                  discountOnQuantity: {
                    quantity: "1",
                    effect: { percentage: 1.0 },
                  },
                },
                items: {
                  products: { productVariantsToAdd: variants.map((v) => v.id) },
                },
              },
            },
          },
        );
        const errors = data.discountAutomaticBxgyCreate.userErrors;
        if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
      },
    });
  }
}

/* ------------------------------------------------------------------- apply */

if (plan.length === 0) {
  console.log("\nNothing to change.\n");
} else if (!APPLY) {
  console.log(`\n${plan.length} change(s) pending. Re-run with --apply to make them.\n`);
} else {
  console.log("");
  let failed = 0;
  for (const step of plan) {
    try {
      await step.run();
      console.log(`  done   ${step.label}`);
    } catch (error) {
      failed += 1;
      console.log(`  FAILED ${step.label}: ${error.message}`);
    }
  }
  console.log(failed ? `\n${failed} step(s) failed.\n` : "\nAll changes applied.\n");
  process.exitCode = failed ? 1 : 0;
}
