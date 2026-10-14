"use server";

import { revalidatePath } from "next/cache";

import {
  createArtworkFile,
  createStagedUpload,
  getArtworkFile,
  type StagedTarget,
} from "@/lib/shopify/admin";
import {
  addCartLines,
  applyDiscountCode,
  artlessCustomLines,
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
  withoutArtlessCustomLines,
  type CartLineInput,
} from "@/lib/shopify/cart";
import { ShopifyError, storefront } from "@/lib/shopify/client";
import { CUSTOMER_CREATE } from "@/lib/shopify/queries";
import {
  checkFile,
  CUSTOM_ART_ATTRIBUTE,
  CUSTOM_CROP_ATTRIBUTE,
  CUSTOM_NOTE_ATTRIBUTE,
  MAX_UPLOAD_BYTES,
} from "@/lib/custom-poster";
import { GIFT_OPTIONS } from "@/lib/offers";
import type { Attribute, Cart } from "@/lib/shopify/types";

export type CartActionResult = { ok: true } | { ok: false; message: string };

/**
 * Brings the cart's automatic parts in line with what's in it.
 *
 * Order matters: the bundle codes are settled first, then the gift. Shopify
 * allows one buy-X-get-Y per order, so whether the gift belongs in the cart
 * depends on whether a bundle was actually applied — and that is only known
 * once Shopify has ruled on the codes. The gift line is never counted toward a
 * bundle, so adding or removing it afterwards cannot change that ruling.
 *
 * Before either, any custom print that has lost — or never had — its artwork
 * is taken out (see artlessCustomLines). Doing it here means a cart that got
 * into that state before the guard existed heals on its next change, and that
 * such a line is never counted toward a bundle it will not be part of.
 *
 * Never throws. Everything here is a bonus on top of a cart change that has
 * already succeeded; a failed discount sync must not turn "added to cart" into
 * an error, or — as it used to in addItem — into a brand-new cart.
 */
async function reconcileCart(cart: Cart): Promise<void> {
  try {
    const { cart: printable } = await withoutArtlessCustomLines(cart);
    const withCodes = await syncCartDiscounts(printable);
    await syncCartGift(withCodes);
  } catch (error) {
    console.error("Cart reconcile failed", error);
  }
}

function toResult(error: unknown): CartActionResult {
  if (error instanceof ShopifyError) {
    return { ok: false, message: error.message };
  }
  console.error("Cart action failed", error);
  return { ok: false, message: "Something went wrong. Please try again." };
}

/** What the customer is told when a custom print arrives without its file. */
const NEEDS_ARTWORK =
  "Custom prints need your artwork. Upload it and we'll add it to your cart.";

/**
 * Adds one line to the visitor's cart, creating the cart if there isn't one.
 *
 * Not exported, and that matters: every export of this file is a Server Action
 * callable from any browser. This takes line ATTRIBUTES, which is how artwork
 * gets attached to an order — so it stays private, and the two exports below
 * decide what attributes a caller is allowed to set.
 */
async function addLine(line: CartLineInput): Promise<CartActionResult> {
  if (!line.merchandiseId) {
    return { ok: false, message: "This product is unavailable." };
  }

  /**
   * Settles a cart that has just had the line added, and says whether the
   * line survived. A custom print with no artwork does not: it is taken
   * straight back out, and the customer is told why instead of finding an
   * unprintable poster in their cart.
   */
  const settle = async (cart: Cart): Promise<CartActionResult> => {
    const { cart: printable, removed } = await withoutArtlessCustomLines(cart);
    await reconcileCart(printable);
    revalidatePath("/", "layout");

    return removed.some((entry) => entry.merchandise.id === line.merchandiseId)
      ? { ok: false, message: NEEDS_ARTWORK }
      : { ok: true };
  };

  try {
    const cartId = await getCartId();

    if (cartId) {
      let existing: Cart | null = null;
      try {
        existing = await addCartLines(cartId, [line]);
      } catch {
        // The cookie outlived the cart (expired, or checkout completed).
        // Fall through and start a new one rather than surfacing an error.
      }

      // Only the add itself is allowed to send us to a fresh cart. This used
      // to wrap the reconcile too, so a hiccup while syncing discounts — after
      // the item was already in — replaced the customer's whole basket with a
      // new one holding just this line.
      if (existing) return await settle(existing);
    }

    const cart = await createCart([line]);
    await setCartId(cart.id);
    return await settle(cart);
  } catch (error) {
    return toResult(error);
  }
}

/**
 * Adds a catalogue product. Takes no attributes on purpose — see addLine. A
 * custom-print variant passed here is refused, since it would arrive with no
 * artwork; those go through addCustomUpload.
 */
export async function addItem(
  merchandiseId: string,
  quantity = 1,
): Promise<CartActionResult> {
  return addLine({ merchandiseId, quantity });
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

/**
 * Used by the client to load the cart, and to re-read it after a mutation.
 *
 * Every read the site makes goes through here, which makes it the place to
 * catch a cart that already holds a custom print with no artwork — one built
 * before the guard in addLine existed, or by any route around it. Such a cart
 * is put right before the customer ever sees it, rather than on whatever
 * change they happen to make next.
 */
export async function fetchCart() {
  try {
    const cart = await getCart();
    if (!cart || artlessCustomLines(cart).length === 0) return cart;

    await reconcileCart(cart);
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
  /**
   * Where the signup came from — "footer", "popup", or
   * "back-in-stock:<handle>". Stored as a Shopify customer tag so the
   * back-in-stock list can actually be mailed when a poster returns, and so
   * the two marketing surfaces can be told apart in reporting. A signup you
   * cannot attribute is a signup you cannot act on.
   */
  source?: string,
): Promise<CartActionResult> {
  try {
    // Shopify rejects tags containing commas, and a product handle is
    // otherwise safe — so only the separator needs stripping.
    const tags = source
      ? [`source:${source.replace(/,/g, "")}`.slice(0, 255)]
      : undefined;

    const data = await storefront<CustomerCreateResponse>(CUSTOMER_CREATE, {
      variables: {
        input: {
          email,
          acceptsMarketing: true,
          password: crypto.randomUUID(),
          ...(tags ? { tags } : {}),
        },
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
 * Step 1 of the custom print flow: hand the browser a pre-signed target so it
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
  const problem = checkFile(file, MAX_UPLOAD_BYTES);
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

export type RegisterArtworkResult =
  | { ok: true; fileId: string }
  | { ok: false; message: string };

/**
 * Step 2: turn the finished upload into a permanent file in the store.
 *
 * The staged upload the browser just wrote to is a holding area that Shopify
 * empties on its own schedule. Putting that address on an order — which is
 * what this flow used to attempt — would leave fulfilment a link that dies
 * before the poster is printed. See createArtworkFile.
 */
export async function registerArtwork(
  resourceUrl: string,
): Promise<RegisterArtworkResult> {
  // Echoed back by the browser, so pinned to Shopify's own upload bucket:
  // `fileCreate` will otherwise fetch any URL it is given into the store.
  let url: URL;
  try {
    url = new URL(resourceUrl);
  } catch {
    return { ok: false, message: "That upload didn't finish. Please try again." };
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "shopify-staged-uploads.storage.googleapis.com"
  ) {
    return { ok: false, message: "That upload didn't finish. Please try again." };
  }

  try {
    return { ok: true, fileId: await createArtworkFile(url.toString()) };
  } catch (error) {
    console.error("Artwork file creation failed", error);
    return {
      ok: false,
      message: "We couldn't save your artwork. Please try again.",
    };
  }
}

export type CustomUploadResult =
  | CartActionResult
  /** Shopify is still processing the file. Call again with the same input. */
  | { ok: false; processing: true; message: string };

/** How long one call waits for Shopify before handing back to the browser. */
const PROCESSING_WAIT_MS = 8_000;
const PROCESSING_POLL_MS = 800;

/**
 * Step 3: add a custom-print variant to the cart, with the artwork's permanent
 * address attached as a line-item attribute so it travels through to the order.
 *
 * The address is looked up here from the file's id rather than accepted from
 * the browser, so the only thing that can end up on an order as "Artwork" is a
 * real file in this store.
 *
 * Shopify processes a new file in the background — a few seconds for a typical
 * upload, longer for a big one. This waits a short while and, if the file is
 * still not ready, says so with `processing: true` instead of holding the
 * request open: the form simply asks again.
 *
 * `variantId` is resolved on the client via `variantForOptions` against the
 * real product data the page already fetched — the same trust model
 * `add-to-cart.tsx` already uses for every ordinary product (Shopify's cart
 * is the price authority regardless of who picked the variant).
 */
export async function addCustomUpload({
  variantId,
  fileId,
  note,
  crop,
  quantity = 1,
}: {
  variantId: string;
  fileId: string;
  note?: string;
  /** Set only when the crop could not be baked into the uploaded file. */
  crop?: string;
  quantity?: number;
}): Promise<CustomUploadResult> {
  if (!variantId) return { ok: false, message: "Pick your options." };

  if (!/^gid:\/\/shopify\/MediaImage\/\d+$/.test(fileId)) {
    return { ok: false, message: "That artwork isn't valid. Please upload it again." };
  }

  try {
    let artworkUrl: string | null = null;
    const deadline = Date.now() + PROCESSING_WAIT_MS;

    for (;;) {
      const file = await getArtworkFile(fileId);

      if (file.status === "ready") {
        artworkUrl = file.url;
        break;
      }
      if (file.status === "failed") {
        console.error("Artwork processing failed", fileId, file.message);
        return {
          ok: false,
          message:
            "We couldn't process that image. Try saving it as a JPG and uploading again.",
        };
      }
      if (Date.now() + PROCESSING_POLL_MS > deadline) {
        return {
          ok: false,
          processing: true,
          message: "Your artwork is still processing. Give it a moment and try again.",
        };
      }

      await new Promise((resolve) => setTimeout(resolve, PROCESSING_POLL_MS));
    }

    const attributes: Attribute[] = [
      { key: CUSTOM_ART_ATTRIBUTE, value: artworkUrl },
    ];

    const trimmedCrop = crop?.trim();
    if (trimmedCrop) {
      attributes.push({
        key: CUSTOM_CROP_ATTRIBUTE,
        value: trimmedCrop.slice(0, 200),
      });
    }

    const trimmedNote = note?.trim();
    if (trimmedNote) {
      attributes.push({
        key: CUSTOM_NOTE_ATTRIBUTE,
        value: trimmedNote.slice(0, 500),
      });
    }

    return await addLine({
      merchandiseId: variantId,
      quantity: Math.min(99, Math.max(1, Math.floor(quantity) || 1)),
      attributes,
    });
  } catch (error) {
    return toResult(error);
  }
}
