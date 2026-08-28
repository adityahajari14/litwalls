"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  BagIcon,
  ChevronDownIcon,
  CloseIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "@/components/icons";
import { useCart } from "@/components/cart/cart-provider";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/offers";
import { MAIN_NAV } from "@/lib/navigation";
import { cn } from "@/lib/cn";
import type { Collection } from "@/lib/shopify/types";

const ICON_BUTTON =
  "grid size-10 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-950";

/**
 * Which MAIN_NAV item gets a collections submenu. Matched by href rather than
 * a boolean on the nav item itself, so the submenu logic lives entirely here
 * instead of leaking a header-specific concern into the shared nav config.
 */
const COLLECTIONS_HREF = "/collections";

export function Header({ collections }: { collections: Collection[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileCollectionsOpen, setMobileCollectionsOpen] = useState(false);
  const [collectionsMenuOpen, setCollectionsMenuOpen] = useState(false);
  const { cart, open: openCart } = useCart();
  const cartCount = cart?.totalQuantity ?? 0;

  // Closes the whole drawer, not just its top level — reopening it later
  // should start collapsed rather than wherever the Collections toggle was left.
  function closeMenu() {
    setMenuOpen(false);
    setMobileCollectionsOpen(false);
  }

  /**
   * Driven in JS rather than pure CSS group-hover: the trigger link and the
   * dropdown panel are visually separated (the panel sits below with a gap
   * for breathing room), and relying on the pointer staying over a continuous
   * hoverable box across that gap was flaky in practice — a small lateral
   * move while crossing it, or ordinary pointer jitter, closed the menu
   * before the cursor reached it. A short close delay tolerates that: the
   * timer is cancelled the instant the pointer lands on either the trigger or
   * the panel, and only actually closes once it's left both for good.
   */
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openCollectionsMenu() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setCollectionsMenuOpen(true);
  }

  function scheduleCloseCollectionsMenu() {
    closeTimer.current = setTimeout(() => setCollectionsMenuOpen(false), 200);
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

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
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-8xl items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:h-20 lg:gap-8 lg:px-8 2xl:px-12">
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
            src="/brand/logo-animated.gif"
            alt="Litwalls"
            width={1123}
            height={387}
            unoptimized
            priority
            className="h-8 w-auto lg:h-10"
          />
        </Link>

        <nav aria-label="Main" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-8">
            {MAIN_NAV.map((item) => {
              const showSubmenu = item.href === COLLECTIONS_HREF && collections.length > 0;

              return (
                <li
                  key={item.href}
                  className="relative"
                  onMouseEnter={showSubmenu ? openCollectionsMenu : undefined}
                  onMouseLeave={showSubmenu ? scheduleCloseCollectionsMenu : undefined}
                >
                  <Link
                    href={item.href}
                    aria-haspopup={showSubmenu ? "true" : undefined}
                    aria-expanded={showSubmenu ? collectionsMenuOpen : undefined}
                    onFocus={showSubmenu ? openCollectionsMenu : undefined}
                    onBlur={showSubmenu ? scheduleCloseCollectionsMenu : undefined}
                    className="relative text-[15px] text-ink-700 transition-colors hover:text-ink-950 after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-0 after:bg-brand-500 after:transition-[width] after:duration-300 hover:after:w-full"
                  >
                    {item.label}
                  </Link>

                  {showSubmenu ? (
                    <div
                      className={cn(
                        "absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 pt-3",
                        "transition-[opacity,visibility] duration-150",
                        collectionsMenuOpen
                          ? "visible opacity-100"
                          : "invisible opacity-0",
                      )}
                      onMouseEnter={openCollectionsMenu}
                      onMouseLeave={scheduleCloseCollectionsMenu}
                    >
                      <ul className="rounded-card border border-ink-100 bg-white p-2 shadow-lift">
                        {collections.map((collection) => (
                          <li key={collection.id}>
                            <Link
                              href={`/collections/${collection.handle}`}
                              className="block rounded-card px-3.5 py-2.5 text-sm text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-950"
                            >
                              {collection.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              );
            })}
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
            onClick={closeMenu}
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-paper shadow-lift">
            <div className="flex h-16 items-center justify-between border-b border-ink-100 px-4">
              <Image
                src="/brand/logo-animated.gif"
                alt="Litwalls"
                width={1123}
                height={387}
                unoptimized
                className="h-8 w-auto"
              />
              <button
                type="button"
                onClick={closeMenu}
                className={ICON_BUTTON}
                aria-label="Close menu"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>

            <nav aria-label="Mobile" className="flex-1 overflow-y-auto p-2">
              <ul>
                {MAIN_NAV.map((item) => {
                  const showSubmenu = item.href === COLLECTIONS_HREF && collections.length > 0;

                  if (!showSubmenu) {
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={closeMenu}
                          className="block rounded-card px-4 py-3.5 font-medium text-ink-800 transition-colors hover:bg-ink-100"
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  }

                  // No hover on touch, so Collections gets a tap-to-expand
                  // disclosure here instead of the desktop hover panel.
                  return (
                    <li key={item.href}>
                      <div className="flex items-center rounded-card hover:bg-ink-100">
                        <Link
                          href={item.href}
                          onClick={closeMenu}
                          className="flex-1 px-4 py-3.5 font-medium text-ink-800"
                        >
                          {item.label}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setMobileCollectionsOpen((open) => !open)}
                          aria-expanded={mobileCollectionsOpen}
                          aria-label={
                            mobileCollectionsOpen
                              ? "Hide collections"
                              : "Show collections"
                          }
                          className="grid size-11 shrink-0 place-items-center text-ink-500"
                        >
                          <ChevronDownIcon
                            className={cn(
                              "size-4 transition-transform duration-200",
                              mobileCollectionsOpen && "rotate-180",
                            )}
                          />
                        </button>
                      </div>

                      {mobileCollectionsOpen ? (
                        <ul className="ml-4 border-l border-ink-100 pl-4">
                          {collections.map((collection) => (
                            <li key={collection.id}>
                              <Link
                                href={`/collections/${collection.handle}`}
                                onClick={closeMenu}
                                className="block rounded-card px-4 py-3 text-sm text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
                              >
                                {collection.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
                <li>
                  <Link
                    href="/account"
                    onClick={closeMenu}
                    className="block rounded-card px-4 py-3.5 font-medium text-ink-800 transition-colors hover:bg-ink-100 sm:hidden"
                  >
                    Account
                  </Link>
                </li>
              </ul>
            </nav>

            <p className="border-t border-ink-100 px-6 py-4 text-sm text-ink-500">
              Free shipping over ₹{FREE_SHIPPING_THRESHOLD}
            </p>
          </div>
        </div>
      ) : null}
    </header>
  );
}
