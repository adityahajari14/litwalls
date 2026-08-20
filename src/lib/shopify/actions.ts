"use server";

import { revalidatePath } from "next/cache";

import { createStagedUpload, type StagedTarget } from "@/lib/shopify/admin";
import {
  addCartLines,
  createCart,
  getCart,
  getCartId,
  removeCartLines,
  setCartId,
  syncCartDiscounts,
  updateCartLines,
  type CartLineInput,
} from "@/lib/shopify/cart";
import { ShopifyError, storefront } from "@/lib/shopify/client";
import { CUSTOMER_CREATE } from "@/lib/shopify/queries";
import { getProduct } from "@/lib/shopify/products";
import {
  checkFile,
  CUSTOM_ART_ATTRIBUTE,
  CUSTOM_NOTE_ATTRIBUTE,
  CUSTOM_POSTER_HANDLE,
  CUSTOM_SIZE_ATTRIBUTE,
  printSize,
} from "@/lib/custom-poster";
import { defaultVariant, type Attribute } from "@/lib/shopify/types";

export type CartActionResult = { ok: true } | { ok: false; message: string };

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
        await syncCartDiscounts(cart);
        revalidatePath("/", "layout");
        return { ok: true };
      } catch {
        // The cookie outlived the cart (expired, or checkout completed).
        // Fall through and start a new one rather than surfacing an error.
      }
    }

    const cart = await createCart([line]);
    await setCartId(cart.id);
    await syncCartDiscounts(cart);
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
    await syncCartDiscounts(cart);

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
    await syncCartDiscounts(cart);
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
 * Step 2: add the custom poster to the cart, with the uploaded artwork's URL
 * attached as a line-item attribute so it travels through to the order.
 *
 * The price is whatever the "custom-poster" product costs in Shopify — this
 * never invents a price, so the store stays the single source of truth.
 */
export async function addCustomPoster({
  artworkUrl,
  sizeId,
  note,
  quantity = 1,
}: {
  artworkUrl: string;
  sizeId: string;
  note?: string;
  quantity?: number;
}): Promise<CartActionResult> {
  const size = printSize(sizeId);
  if (!size) return { ok: false, message: "Pick a size." };

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

  try {
    const product = await getProduct(CUSTOM_POSTER_HANDLE);
    if (!product) {
      return {
        ok: false,
        message: "Custom posters are unavailable right now.",
      };
    }

    const variant = defaultVariant(product);
    if (!variant?.availableForSale) {
      return {
        ok: false,
        message: "Custom posters are unavailable right now.",
      };
    }

    const attributes: Attribute[] = [
      { key: CUSTOM_ART_ATTRIBUTE, value: artworkUrl },
      { key: CUSTOM_SIZE_ATTRIBUTE, value: size.label },
    ];

    const trimmedNote = note?.trim();
    if (trimmedNote) {
      attributes.push({
        key: CUSTOM_NOTE_ATTRIBUTE,
        value: trimmedNote.slice(0, 500),
      });
    }

    return await addItem(variant.id, quantity, attributes);
  } catch (error) {
    return toResult(error);
  }
}
