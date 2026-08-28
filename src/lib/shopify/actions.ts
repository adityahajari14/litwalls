"use server";

import { revalidatePath } from "next/cache";

import { createStagedUpload, type StagedTarget } from "@/lib/shopify/admin";
import {
  addCartLines,
  applyDiscountCode,
  createCart,
  getCart,
  getCartId,
  removeCartLines,
  removeDiscountCode,
  setCartId,
  setGiftChoice,
  syncCartDiscounts,
  syncCartGift,
  updateCartLines,
  type CartLineInput,
} from "@/lib/shopify/cart";
import { ShopifyError, storefront } from "@/lib/shopify/client";
import { CUSTOMER_CREATE } from "@/lib/shopify/queries";
import { checkFile, CUSTOM_ART_ATTRIBUTE, CUSTOM_NOTE_ATTRIBUTE } from "@/lib/custom-poster";
import { GIFT_OPTIONS } from "@/lib/offers";
import type { Attribute, Cart } from "@/lib/shopify/types";

export type CartActionResult = { ok: true } | { ok: false; message: string };

/**
 * Brings the cart's automatic parts in line with what's in it.
 *
 * Order matters: the gift is settled first, then the bundle codes are
 * recalculated against the resulting lines. The gift itself is an automatic
 * Shopify discount, so it needs no code — but whether it belongs in the cart
 * at all depends on which bundle the cart earned, so it has to be decided
 * before the codes are written.
 */
async function reconcileCart(cart: Cart): Promise<void> {
  const withGift = await syncCartGift(cart);
  await syncCartDiscounts(withGift);
}

function toResult(error: unknown): CartActionResult {
  if (error instanceof ShopifyError) {
    return { ok: false, message: error.message };
  }
  console.error("Cart action failed", error);
  return { ok: false, message: "Something went wrong. Please try again." };
}

export async function addItem(
  merchandiseId: string,
  quantity = 1,
  attributes?: Attribute[],
): Promise<CartActionResult> {
  if (!merchandiseId) {
    return { ok: false, message: "This product is unavailable." };
  }

  const line: CartLineInput = { merchandiseId, quantity, attributes };

  try {
    const cartId = await getCartId();

    if (cartId) {
      try {
        const cart = await addCartLines(cartId, [line]);
        await reconcileCart(cart);
        revalidatePath("/", "layout");
        return { ok: true };
      } catch {
        // The cookie outlived the cart (expired, or checkout completed).
        // Fall through and start a new one rather than surfacing an error.
      }
    }

    const cart = await createCart([line]);
    await setCartId(cart.id);
    await reconcileCart(cart);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function updateItemQuantity(
  lineId: string,
  quantity: number,
): Promise<CartActionResult> {
  try {
    const cartId = await getCartId();
    if (!cartId) return { ok: false, message: "Your cart has expired." };

    const cart =
      quantity <= 0
        ? await removeCartLines(cartId, [lineId])
        : await updateCartLines(cartId, [{ id: lineId, quantity }]);

    // Re-evaluated on every change, so the discount steps down when the
    // customer drops below a rung, not just up when they cross one.
    await reconcileCart(cart);

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function removeItem(lineId: string): Promise<CartActionResult> {
  try {
    const cartId = await getCartId();
    if (!cartId) return { ok: false, message: "Your cart has expired." };

    const cart = await removeCartLines(cartId, [lineId]);
    await reconcileCart(cart);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

/**
 * Applies a code the customer typed into the cart.
 *
 * Reports Shopify's verdict rather than assuming the code worked: Shopify
 * accepts an unknown or expired code without raising an error, marking it
 * `applicable: false`. Telling someone a dead code was accepted, and letting
 * them find out at checkout, is worse than saying no here.
 */
export async function applyDiscount(code: string): Promise<CartActionResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, message: "Enter a code." };

  try {
    const cart = await getCart();
    if (!cart) return { ok: false, message: "Your cart is empty." };

    const updated = await applyDiscountCode(cart, normalized);

    const accepted = updated.discountCodes.some(
      (discount) => discount.code === normalized && discount.applicable,
    );

    if (!accepted) {
      // Take it straight back off. Leaving an inapplicable code on the cart
      // means it silently starts working later if the basket changes, which
      // is not what the customer was told just now.
      await removeDiscountCode(updated, normalized);
      return {
        ok: false,
        message: `${normalized} can't be used on this order.`,
      };
    }

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

/**
 * Records which free gift the customer wants and, if the cart already
 * qualifies for one, swaps the line immediately rather than waiting for the
 * next unrelated cart change to notice the preference changed.
 */
export async function setGiftPreference(id: string): Promise<CartActionResult> {
  if (!GIFT_OPTIONS.some((option) => option.id === id)) {
    return { ok: false, message: "That isn't a gift option." };
  }

  try {
    await setGiftChoice(id);

    const cart = await getCart();
    if (cart) await reconcileCart(cart);

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function removeDiscount(code: string): Promise<CartActionResult> {
  try {
    const cart = await getCart();
    if (!cart) return { ok: false, message: "Your cart is empty." };

    await removeDiscountCode(cart, code);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

/** Used by the client cart drawer to re-read state after a mutation. */
export async function fetchCart() {
  try {
    return await getCart();
  } catch {
    return null;
  }
}

type CustomerCreateResponse = {
  customerCreate: {
    customer: { id: string } | null;
    customerUserErrors: { code: string | null; field: string[] | null; message: string }[];
  };
};

export async function subscribeToNewsletter(
  email: string,
): Promise<CartActionResult> {
  try {
    const data = await storefront<CustomerCreateResponse>(CUSTOMER_CREATE, {
      variables: {
        input: { email, acceptsMarketing: true, password: crypto.randomUUID() },
      },
    });

    const errors = data.customerCreate.customerUserErrors;
    // Someone re-subscribing with an existing email should still get the
    // code, not an error — TAKEN is Shopify's code for that case.
    const isTaken = errors.some((error) => error.code === "TAKEN");
    if (errors.length > 0 && !isTaken) {
      return { ok: false, message: errors[0].message };
    }

    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

/* ---------------------------------------------------------------- custom */

export type StagedUploadResult =
  | { ok: true; target: StagedTarget }
  | { ok: false; message: string };

/**
 * Step 1 of the custom poster flow: hand the browser a pre-signed target so it
 * can upload the artwork straight to Shopify, bypassing this server entirely.
 *
 * Only the file's *metadata* crosses this boundary, which is what keeps the
 * request under the Server Action body limit — the bytes go direct.
 */
export async function createArtworkUpload(file: {
  name: string;
  type: string;
  size: number;
}): Promise<StagedUploadResult> {
  // The browser already checked this, but the browser is not a trust boundary.
  const problem = checkFile(file);
  if (problem) return { ok: false, message: problem.message };

  try {
    const target = await createStagedUpload({
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });

    return { ok: true, target };
  } catch (error) {
    console.error("Staged upload failed", error);
    return {
      ok: false,
      message: "We couldn't start the upload. Please try again.",
    };
  }
}

/**
 * Step 2: add a custom-print variant to the cart, with the uploaded artwork's
 * URL attached as a line-item attribute so it travels through to the order.
 *
 * `variantId` is resolved on the client via `variantForOptions` against the
 * real product data the page already fetched — the same trust model
 * `add-to-cart.tsx` already uses for every ordinary product (Shopify's cart
 * is the price authority regardless of who picked the variant). This used to
 * always add the cheapest variant of a single hardcoded product no matter
 * which size the customer picked; resolving a real variant on the client
 * instead of a free-text size label is the fix.
 */
export async function addCustomUpload({
  variantId,
  artworkUrl,
  note,
  quantity = 1,
}: {
  variantId: string;
  artworkUrl: string;
  note?: string;
  quantity?: number;
}): Promise<CartActionResult> {
  if (!variantId) return { ok: false, message: "Pick your options." };

  // The artwork URL is echoed back by the browser after it uploads. Pin it to
  // Shopify's own storage so a compromised client can't put an arbitrary link
  // — or a tracking pixel — onto a real order.
  let host: string;
  try {
    host = new URL(artworkUrl).hostname;
  } catch {
    return { ok: false, message: "That artwork link isn't valid." };
  }
  if (!/(^|\.)shopify\.com$/.test(host) && !/(^|\.)myshopify\.com$/.test(host)) {
    return { ok: false, message: "That artwork link isn't valid." };
  }

  const attributes: Attribute[] = [{ key: CUSTOM_ART_ATTRIBUTE, value: artworkUrl }];

  const trimmedNote = note?.trim();
  if (trimmedNote) {
    attributes.push({
      key: CUSTOM_NOTE_ATTRIBUTE,
      value: trimmedNote.slice(0, 500),
    });
  }

  try {
    return await addItem(variantId, quantity, attributes);
  } catch (error) {
    return toResult(error);
  }
}
