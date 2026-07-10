"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { fetchCart } from "@/lib/shopify/actions";
import type { Cart } from "@/lib/shopify/types";

type CartContextValue = {
  cart: Cart | null;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Re-reads the cart from Shopify and returns it, so callers can use it immediately. */
  refresh: () => Promise<Cart | null>;
  setCart: (cart: Cart | null) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  initialCart = null,
  children,
}: {
  initialCart?: Cart | null;
  children: React.ReactNode;
}) {
  const [cart, setCart] = useState<Cart | null>(initialCart);
  const [isOpen, setIsOpen] = useState(false);

  const refresh = useCallback(async () => {
    const next = await fetchCart();
    setCart(next);
    return next;
  }, []);

  const value = useMemo(
    () => ({
      cart,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      refresh,
      setCart,
    }),
    [cart, isOpen, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside <CartProvider>");
  }
  return context;
}
