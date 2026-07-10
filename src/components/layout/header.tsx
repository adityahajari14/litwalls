"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  BagIcon,
  CloseIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "@/components/icons";
import { useCart } from "@/components/cart/cart-provider";
import { MAIN_NAV } from "@/lib/navigation";
import { cn } from "@/lib/cn";

const ICON_BUTTON =
  "grid size-10 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-950";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { cart, open: openCart } = useCart();
  const cartCount = cart?.totalQuantity ?? 0;

  // The drawer is a full-screen overlay; letting the page scroll behind it
  // strands the user somewhere else when they close it.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:h-20 lg:gap-8 lg:px-8">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className={cn(ICON_BUTTON, "-ml-2 lg:hidden")}
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          <MenuIcon className="size-5" />
        </button>

        <Link href="/" className="shrink-0" aria-label="Litwalls home">
          <Image
            src="/brand/logo.png"
            alt="Litwalls"
            width={156}
            height={75}
            priority
            className="h-8 w-auto lg:h-10"
          />
        </Link>

        <nav aria-label="Main" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-8">
            {MAIN_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="relative text-[15px] text-ink-700 transition-colors hover:text-ink-950 after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-0 after:bg-brand-500 after:transition-[width] after:duration-300 hover:after:w-full"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <Link href="/search" className={ICON_BUTTON} aria-label="Search">
            <SearchIcon className="size-5" />
          </Link>
          <Link
            href="/account"
            className={cn(ICON_BUTTON, "hidden sm:grid")}
            aria-label="Account"
          >
            <UserIcon className="size-5" />
          </Link>
          <button
            type="button"
            onClick={openCart}
            className={cn(ICON_BUTTON, "relative -mr-2")}
            aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
          >
            <BagIcon className="size-5" />
            {cartCount > 0 ? (
              <span className="absolute top-1 right-1 grid size-4.5 place-items-center rounded-full bg-brand-500 text-[10px] font-semibold text-white">
                {cartCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-paper shadow-lift">
            <div className="flex h-16 items-center justify-between border-b border-ink-100 px-4">
              <Image
                src="/brand/logo.png"
                alt="Litwalls"
                width={156}
                height={75}
                className="h-8 w-auto"
              />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className={ICON_BUTTON}
                aria-label="Close menu"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>

            <nav aria-label="Mobile" className="flex-1 overflow-y-auto p-2">
              <ul>
                {MAIN_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg px-4 py-3.5 font-medium text-ink-800 transition-colors hover:bg-ink-100"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-4 py-3.5 font-medium text-ink-800 transition-colors hover:bg-ink-100 sm:hidden"
                  >
                    Account
                  </Link>
                </li>
              </ul>
            </nav>

            <p className="border-t border-ink-100 px-6 py-4 text-sm text-ink-500">
              Free shipping over ₹499
            </p>
          </div>
        </div>
      ) : null}
    </header>
  );
}
