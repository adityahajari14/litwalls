"use server";

import { revalidatePath } from "next/cache";

import {
  addCartLines,
  createCart,
  getCart,
  getCartId,
  removeCartLines,
  setCartId,
  updateCartLines,
} from "@/lib/shopify/cart";
import { ShopifyError, storefront } from "@/lib/shopify/client";
import { CUSTOMER_CREATE } from "@/lib/shopify/queries";

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
): Promise<CartActionResult> {
  if (!merchandiseId) {
    return { ok: false, message: "This product is unavailable." };
  }

  try {
    const cartId = await getCartId();

    if (cartId) {
      try {
        await addCartLines(cartId, [{ merchandiseId, quantity }]);
        revalidatePath("/", "layout");
        return { ok: true };
      } catch {
        // The cookie outlived the cart (expired, or checkout completed).
        // Fall through and start a new one rather than surfacing an error.
      }
    }

    const cart = await createCart([{ merchandiseId, quantity }]);
    await setCartId(cart.id);
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

    if (quantity <= 0) {
      await removeCartLines(cartId, [lineId]);
    } else {
      await updateCartLines(cartId, [{ id: lineId, quantity }]);
    }

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

    await removeCartLines(cartId, [lineId]);
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
