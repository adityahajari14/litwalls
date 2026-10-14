import { CUSTOM_ART_ATTRIBUTE } from "@/lib/custom-poster";
import { GIFT_ATTRIBUTE } from "@/lib/offers";
import { absoluteUrl } from "@/lib/site";
import type { Cart } from "@/lib/shopify/types";

/**
 * Turning our Shopify cart into a Fastrr `cart_data` — and deciding when it
 * cannot be turned into one faithfully.
 *
 * Fastrr does not read our cart and does not know our discounts. Bundles,
 * LIT100 and the free gift all live in Shopify; Fastrr's own coupon engine has
 * never heard of them. So nothing is left for it to work out:
 *
 *   - every item carries the price Shopify is charging (`catalog_data`), so a
 *     stale catalogue sync on their side can never change what a shopper pays;
 *   - everything Shopify took off is sent as ONE fixed amount
 *     (`cart_discount`). Their API applies exactly that and nothing else, which
 *     is what lets a stacked bundle + LIT100, or the free gift, go through
 *     without Fastrr needing to understand either.
 *
 * Shopify stays the price authority. This module only restates its verdict.
 */

/**
 * Whether custom-print orders may go through Fastrr. On unless switched off.
 *
 * A custom poster's artwork URL is a LINE attribute — it is the only thing
 * telling fulfilment which file to print — and Fastrr's cart has no per-line
 * attributes. So they never travel through Fastrr at all: the order webhook
 * puts them back by reading the Shopify cart the checkout was signed from
 * (see resolveLines in fastrr-order.ts), and tags the order for review if a
 * custom print ever ends up without its artwork.
 *
 * `NEXT_PUBLIC_FASTRR_ALLOW_CUSTOM=false` sends custom carts to Shopify's
 * checkout instead, where line attributes are native. That is the switch to
 * pull if a Fastrr order for a custom print ever arrives without its Artwork.
 */
const ALLOW_CUSTOM = process.env.NEXT_PUBLIC_FASTRR_ALLOW_CUSTOM !== "false";

export type FastrrItem = {
  /** Numeric Shopify variant id as a string — NOT the Storefront GID. */
  variant_id: string;
  quantity: number;
  /** All three are required by their API whenever the object is present. */
  catalog_data: { price: number; name: string; image_url: string };
};

export type FastrrCartData = {
  items: FastrrItem[];
  /** When present, this fixed amount is the only discount Fastrr applies. */
  cart_discount?: { coupon_code: string; amount: number };
};

export type Eligibility =
  | { eligible: true; cartData: FastrrCartData }
  | { eligible: false; reason: string };

/**
 * The numeric id out of a Storefront GID.
 *
 * Storefront gives `gid://shopify/ProductVariant/46745700729006`; Fastrr wants
 * `"46745700729006"`. Passing the GID through fails silently — the checkout
 * simply cannot find the variant — so an unparseable id disqualifies the whole
 * cart rather than shipping a broken line.
 */
export function shopifyVariantId(gid: string): string | null {
  const id = gid.split("/").pop() ?? "";
  return /^\d+$/.test(id) ? id : null;
}

/** Rupees → paise, so sums and differences are exact rather than float-ish. */
function paise(amount: string | number): number {
  return Math.round(Number(amount) * 100);
}

/**
 * Can this cart go through Fastrr, and if so, as what?
 *
 * Every `eligible: false` below is a deliberate hand-off to Shopify checkout,
 * not a failure. The `reason` is for logging — it is never shown to the
 * shopper, who should not have to care which checkout they got.
 */
export function fastrrEligibility(cart: Cart): Eligibility {
  if (cart.lines.nodes.length === 0) {
    return { eligible: false, reason: "empty-cart" };
  }

  const hasCustomArtwork = cart.lines.nodes.some((line) =>
    line.attributes.some((a) => a.key === CUSTOM_ART_ATTRIBUTE),
  );

  if (hasCustomArtwork && !ALLOW_CUSTOM) {
    return { eligible: false, reason: "custom-artwork" };
  }

  // Their API requires `variant_id` to be unique across items, and Shopify
  // routinely holds one variant on two lines — a buy-X-get-Y splits a line
  // into a paid one and a free one. Merged here; the discount that made one of
  // them free is carried by `cart_discount` instead.
  const items = new Map<string, FastrrItem>();
  let fullPrice = 0;

  for (const line of cart.lines.nodes) {
    const variantId = shopifyVariantId(line.merchandise.id);
    if (!variantId) {
      return { eligible: false, reason: "unparseable-variant-id" };
    }

    const unit = paise(line.merchandise.price.amount);
    fullPrice += unit * line.quantity;

    const existing = items.get(variantId);
    if (existing) {
      existing.quantity += line.quantity;
      continue;
    }

    const { product, title } = line.merchandise;
    items.set(variantId, {
      variant_id: variantId,
      quantity: line.quantity,
      catalog_data: {
        price: unit / 100,
        // "Default Title" is Shopify's placeholder for a product without
        // options; it means nothing to a shopper.
        name:
          title && title !== "Default Title"
            ? `${product.title} — ${title}`
            : product.title,
        image_url: product.featuredImage?.url ?? absoluteUrl("/icon.png"),
      },
    });
  }

  // (full price − what Shopify says is owed), the same derivation the cart
  // drawer uses — see cartDiscountTotal for why allocations can't be summed.
  const payable = paise(cart.cost.totalAmount.amount);
  const discount = Math.max(0, fullPrice - payable);

  // A cart that costs nothing has no payment for Fastrr to take. Shopify's
  // checkout already knows how to complete a free order.
  if (payable <= 0) {
    return { eligible: false, reason: "zero-total" };
  }

  const cartData: FastrrCartData = { items: [...items.values()] };

  if (discount > 0) {
    // Shopify decides which codes actually apply; one it marked inapplicable
    // contributed nothing and must not be named as though it had.
    const labels = cart.discountCodes
      .filter((code) => code.applicable)
      .map((code) => code.code);

    const hasFreeGift = cart.lines.nodes.some(
      (line) =>
        line.attributes.some((a) => a.key === GIFT_ATTRIBUTE) &&
        Number(line.cost.totalAmount.amount) === 0,
    );
    // The gift is an AUTOMATIC discount, so it has no code of its own.
    if (hasFreeGift) labels.push("FREEGIFT");

    cartData.cart_discount = {
      coupon_code: labels.join("+") || "LITWALLS",
      amount: discount / 100,
    };
  }

  return { eligible: true, cartData };
}
