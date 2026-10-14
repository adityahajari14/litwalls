"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  ArrowRightIcon,
  BagIcon,
  ChevronDownIcon,
  CloseIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "@/components/icons";
import { CartBadge } from "@/components/cart/cart-badge";
import { useCart } from "@/components/cart/cart-provider";
import { SearchDialog } from "@/components/search/search-dialog";
import { Overlay } from "@/components/ui/overlay";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/offers";
import { MAIN_NAV } from "@/lib/navigation";
import { cn } from "@/lib/cn";
import type { CollectionSummary } from "@/lib/shopify/types";

const ICON_BUTTON =
  "grid size-10 place-items-center rounded-full text-ink-700 transition duration-200 hover:bg-ink-100 hover:text-ink-950 active:scale-95";

/**
 * Which MAIN_NAV item gets a collections submenu. Matched by href rather than
 * a boolean on the nav item itself, so the submenu logic lives entirely here
 * instead of leaking a header-specific concern into the shared nav config.
 */
const COLLECTIONS_HREF = "/collections";

/** Most tiles the desktop panel shows; "Browse all" carries the rest. */
const PANEL_TILES = 8;

/**
 * Pointer has to rest on the trigger this long before the panel opens, so
 * sweeping across the nav on the way to the cart doesn't flash it.
 */
const OPEN_DELAY_MS = 70;

/**
 * And has to be gone this long before it closes — long enough to cross the gap
 * between trigger and panel, or to recover from overshooting an edge.
 */
const CLOSE_DELAY_MS = 180;

function posterCount(count: number) {
  return `${count >= 250 ? "250+" : count} poster${count === 1 ? "" : "s"}`;
}

/** True when `href` is the page being viewed, or a parent of it. */
function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header({ collections }: { collections: CollectionSummary[] }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
   *
   * One timer for both directions, so a pending open and a pending close can
   * never both be live and fire out of order.
   */
  const menuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setCollectionsMenu(open: boolean, delay: number) {
    if (menuTimer.current) clearTimeout(menuTimer.current);
    menuTimer.current =
      delay > 0
        ? setTimeout(() => setCollectionsMenuOpen(open), delay)
        : null;
    if (delay === 0) setCollectionsMenuOpen(open);
  }

  useEffect(() => {
    return () => {
      if (menuTimer.current) clearTimeout(menuTimer.current);
    };
  }, []);

  // Arriving on a new page closes whatever was open. Without this the
  // collections panel stayed up after its own links were clicked — the pointer
  // was still over it, so nothing ever told it to close — and covered the top
  // of the page it had just navigated to.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setCollectionsMenuOpen(false);
    setMenuOpen(false);
    setMobileCollectionsOpen(false);
  }

  // ⌘K / Ctrl-K opens search from anywhere; "/" does too, but only when the
  // shopper isn't already typing into a field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setSearchOpen(true);
      } else if (key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const panelCollections = collections.slice(0, PANEL_TILES);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-8xl items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:h-20 lg:gap-8 lg:px-8 2xl:px-12 3xl:max-w-9xl 3xl:px-16">
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
          {/* Animated, so `unoptimized` is mandatory — next/image would strip
              the animation. That makes the file we commit the file every
              visitor downloads, which is why it is pre-sized to the 240px it
              is actually drawn at rather than the 1123px master (see
              scripts/optimize-logo.js; the master lives in assets/).

              `loading="eager"` rather than `preload`: this is above the fold
              and must not lazy-load, but it is never the LCP element, and a
              <link rel="preload"> here competes with the hero for the first
              bytes on the one page where the hero is the LCP. */}
          <Image
            src="/brand/logo-animated.webp"
            alt="Litwalls"
            width={240}
            height={83}
            unoptimized
            loading="eager"
            className="h-8 w-auto lg:h-10"
          />
        </Link>

        <nav aria-label="Main" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-8">
            {MAIN_NAV.map((item) => {
              const showSubmenu =
                item.href === COLLECTIONS_HREF && collections.length > 0;
              const current = isCurrent(pathname, item.href);

              const linkClass = cn(
                "relative inline-flex items-center gap-1 py-2 text-[15px] transition-colors hover:text-ink-950",
                "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:bg-brand-500 after:transition-[width] after:duration-300 after:ease-out-soft hover:after:w-full",
                current ? "text-ink-950 after:w-full" : "text-ink-700 after:w-0",
              );

              if (!showSubmenu) {
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                      className={linkClass}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }

              return (
                <li
                  key={item.href}
                  className="relative"
                  onMouseEnter={() => setCollectionsMenu(true, OPEN_DELAY_MS)}
                  onMouseLeave={() => setCollectionsMenu(false, CLOSE_DELAY_MS)}
                  // On the <li>, not the link: focus events bubble, so tabbing
                  // from the trigger into the panel is a blur immediately
                  // followed by a focus, and the close never fires. Bound to
                  // the link alone, the panel shut the moment a keyboard user
                  // stepped into it.
                  onFocus={() => setCollectionsMenu(true, 0)}
                  onBlur={() => setCollectionsMenu(false, CLOSE_DELAY_MS)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setCollectionsMenu(false, 0);
                  }}
                >
                  <Link
                    href={item.href}
                    aria-haspopup="true"
                    aria-expanded={collectionsMenuOpen}
                    aria-current={current ? "page" : undefined}
                    // The click is a navigation to /collections; the panel has
                    // done its job at that point and should get out of the way
                    // rather than hang over the page that is loading.
                    onClick={() => setCollectionsMenu(false, 0)}
                    className={cn(
                      linkClass,
                      collectionsMenuOpen && "text-ink-950 after:w-full",
                    )}
                  >
                    {item.label}
                    <ChevronDownIcon
                      className={cn(
                        "size-3.5 text-ink-400 transition-transform duration-300 ease-out-soft",
                        collectionsMenuOpen && "rotate-180",
                      )}
                    />
                  </Link>

                  {/* A grid of covers, not a list of words. This was a
                      12-item single column of text labels — for a product
                      whose artwork is the entire reason to click, which made
                      the menu the one place on the site that showed none of
                      it. The covers are already fetched for the layout, so
                      the thumbnails cost no extra request. */}
                  <div
                    className={cn(
                      // `pt-4` is the gap below the header, kept inside the
                      // hoverable box so the pointer never leaves it on the
                      // way down.
                      "absolute left-1/2 top-full z-50 -translate-x-1/2 pt-4",
                      // Settles downward out of the trigger, the same
                      // direction the search dialog arrives from, so the
                      // panel reads as belonging to the link above it rather
                      // than appearing over it. `visibility` is transitioned
                      // too, so the closed panel is neither focusable nor
                      // clickable but still gets to fade out first.
                      "origin-top transition-[opacity,visibility,translate,scale] ease-out-soft",
                      collectionsMenuOpen
                        ? "visible translate-y-0 scale-100 opacity-100 duration-300"
                        : "pointer-events-none invisible -translate-y-2 scale-[0.98] opacity-0 duration-200",
                    )}
                  >
                    <div className="rounded-card border border-ink-100 bg-white p-3 shadow-lift">
                      <ul
                        className="grid gap-1"
                        // Sized to the collections there are, so three of
                        // them make a three-wide panel rather than a
                        // four-wide one with a hole in it.
                        style={{
                          gridTemplateColumns: `repeat(${Math.min(panelCollections.length, 4)}, 9.5rem)`,
                        }}
                      >
                        {panelCollections.map((collection) => (
                          <li key={collection.id}>
                            <Link
                              href={`/collections/${collection.handle}`}
                              onClick={() => setCollectionsMenu(false, 0)}
                              className="group/tile block rounded-card p-2 transition-colors duration-200 hover:bg-ink-50"
                            >
                              <div className="relative aspect-4/5 overflow-hidden rounded-card bg-ink-100 ring-1 ring-ink-950/5">
                                {collection.image ? (
                                  <Image
                                    src={collection.image.url}
                                    alt=""
                                    fill
                                    sizes="9.5rem"
                                    className="object-cover transition-transform duration-500 ease-out-soft group-hover/tile:scale-105"
                                  />
                                ) : (
                                  <span className="grid size-full place-items-center bg-ink-950 font-display text-2xl text-white/90">
                                    {collection.title.charAt(0)}
                                  </span>
                                )}
                              </div>
                              <span className="mt-2 block truncate text-[13px] font-medium text-ink-900 transition-colors group-hover/tile:text-brand-600">
                                {collection.title}
                              </span>
                              <span className="block text-xs text-ink-400">
                                {posterCount(collection.productCount)}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>

                      <Link
                        href="/collections"
                        onClick={() => setCollectionsMenu(false, 0)}
                        className="group/all mt-2 flex items-center justify-center gap-1.5 border-t border-ink-100 pt-3 pb-1 text-[13px] font-medium text-ink-600 transition-colors hover:text-brand-600"
                      >
                        Browse all collections
                        <ArrowRightIcon className="size-3.5 transition-transform duration-300 group-hover/all:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={ICON_BUTTON}
            aria-label="Search"
            aria-expanded={searchOpen}
          >
            <SearchIcon className="size-5" />
          </button>
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
            <CartBadge count={cartCount} />
          </button>
        </div>
      </div>

      {/* Portalled into <body> by Overlay. Rendered here it sat inside this
          header's `backdrop-blur`, which makes the header the containing
          block for `position: fixed` — so the "full-screen" drawer was laid
          out against a 64px-high strip and its nav collapsed to nothing. */}
      <Overlay
        open={menuOpen}
        onClose={closeMenu}
        label="Menu"
        side="left"
        className="z-60 lg:hidden"
        panelClassName="w-[min(22rem,88vw)] bg-paper shadow-lift"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink-100 px-4">
          <Link href="/" onClick={closeMenu} aria-label="Litwalls home">
            <Image
              src="/brand/logo-animated.webp"
              alt="Litwalls"
              width={240}
              height={83}
              unoptimized
              className="h-8 w-auto"
            />
          </Link>
          <button
            type="button"
            onClick={closeMenu}
            className={ICON_BUTTON}
            aria-label="Close menu"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <nav
          aria-label="Mobile"
          className="flex-1 overflow-y-auto overscroll-contain px-3 py-4"
        >
          {/* Looks like the search field it opens. Search is the fastest way
              through a catalogue on a phone, and from inside the menu it was
              two taps and a close away. */}
          <button
            type="button"
            onClick={() => {
              closeMenu();
              setSearchOpen(true);
            }}
            className="mb-3 flex h-11 w-full items-center gap-3 rounded-full border border-ink-200 bg-white px-4 text-left text-sm text-ink-400 transition-colors hover:border-ink-300"
          >
            <SearchIcon className="size-4 shrink-0" />
            Search posters
          </button>

          <ul className="stagger-in">
            {MAIN_NAV.map((item, index) => {
              const showSubmenu =
                item.href === COLLECTIONS_HREF && collections.length > 0;
              const current = isCurrent(pathname, item.href);
              const stagger = { "--i": index } as React.CSSProperties;

              const rowClass = cn(
                "block rounded-card px-4 py-3.5 text-[17px] font-medium transition-colors",
                current ? "text-brand-600" : "text-ink-900",
              );

              if (!showSubmenu) {
                return (
                  <li key={item.href} style={stagger}>
                    <Link
                      href={item.href}
                      onClick={closeMenu}
                      aria-current={current ? "page" : undefined}
                      className={cn(rowClass, "active:bg-ink-100")}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }

              // No hover on touch, so Collections gets a tap-to-expand
              // disclosure here instead of the desktop hover panel.
              return (
                <li key={item.href} style={stagger}>
                  <div className="flex items-center rounded-card">
                    <Link
                      href={item.href}
                      onClick={closeMenu}
                      aria-current={current ? "page" : undefined}
                      className={cn(rowClass, "flex-1 active:bg-ink-100")}
                    >
                      {item.label}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setMobileCollectionsOpen((open) => !open)}
                      aria-expanded={mobileCollectionsOpen}
                      aria-controls="mobile-collections"
                      aria-label={
                        mobileCollectionsOpen
                          ? "Hide collections"
                          : "Show collections"
                      }
                      className="grid size-12 shrink-0 place-items-center rounded-full text-ink-500 transition-colors active:bg-ink-100"
                    >
                      <ChevronDownIcon
                        className={cn(
                          "size-4 transition-transform duration-300 ease-out-soft",
                          mobileCollectionsOpen && "rotate-180",
                        )}
                      />
                    </button>
                  </div>

                  {/* Grid rows 0fr → 1fr is the one way to animate to a
                      height the browser has to measure that works everywhere.
                      The list stays in the DOM, so `inert` is what keeps its
                      links out of the tab order while it is collapsed. */}
                  <div
                    id="mobile-collections"
                    inert={!mobileCollectionsOpen}
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-300 ease-out-soft",
                      mobileCollectionsOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <ul className="min-h-0 overflow-hidden">
                      {collections.map((collection) => (
                        <li key={collection.id}>
                          <Link
                            href={`/collections/${collection.handle}`}
                            onClick={closeMenu}
                            className="flex items-center gap-3 rounded-card px-4 py-2 transition-colors active:bg-ink-100"
                          >
                            <span className="relative block h-12 w-10 shrink-0 overflow-hidden rounded bg-ink-100 ring-1 ring-ink-950/5">
                              {collection.image ? (
                                <Image
                                  src={collection.image.url}
                                  alt=""
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              ) : null}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[15px] text-ink-800">
                                {collection.title}
                              </span>
                              <span className="block text-xs text-ink-400">
                                {posterCount(collection.productCount)}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
            <li style={{ "--i": MAIN_NAV.length } as React.CSSProperties}>
              <Link
                href="/account"
                onClick={closeMenu}
                className="flex items-center gap-2.5 rounded-card px-4 py-3.5 text-[17px] font-medium text-ink-900 transition-colors active:bg-ink-100"
              >
                <UserIcon className="size-5 text-ink-500" />
                Account
              </Link>
            </li>
          </ul>
        </nav>

        <p className="shrink-0 border-t border-ink-100 px-6 py-4 text-sm text-ink-500">
          Free shipping over ₹{FREE_SHIPPING_THRESHOLD}
        </p>
      </Overlay>

      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        collections={collections}
      />
    </header>
  );
}
