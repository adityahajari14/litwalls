"use client";

import { useEffect } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { fetchCart } from "@/lib/shopify/actions";

/**
 * Loads any existing cart once on mount.
 *
 * The cart id lives in an httpOnly cookie, so reading it needs a request-time
 * API. Doing that in the root layout would make every route dynamic, so we
 * fetch from the client instead and let the catalogue stay static.
 */
export function CartLoader() {
  const { setCart } = useCart();

  useEffect(() => {
    let active = true;

    fetchCart().then((cart) => {
      if (active && cart) setCart(cart);
    });

    return () => {
      active = false;
    };
  }, [setCart]);

  return null;
}
