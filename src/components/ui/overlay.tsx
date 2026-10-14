"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { usePresence } from "@/lib/use-presence";

type Side = "left" | "right" | "top";

/**
 * Where the panel sits, and where it travels from.
 *
 * `translate` / `scale` are their own CSS properties in Tailwind v4, so the
 * transition list names those rather than `transform`.
 */
const PANEL: Record<Side, { base: string; open: string; closed: string }> = {
  left: {
    base: "absolute inset-y-0 left-0 flex flex-col",
    open: "translate-x-0",
    closed: "-translate-x-full",
  },
  right: {
    base: "absolute inset-y-0 right-0 flex flex-col",
    open: "translate-x-0",
    closed: "translate-x-full",
  },
  top: {
    base: "absolute inset-x-0 top-0 mx-auto flex flex-col",
    open: "translate-y-0 scale-100 opacity-100",
    closed: "-translate-y-3 scale-[0.98] opacity-0",
  },
};

/** Matches the exit duration below; usePresence unmounts once it has played. */
const EXIT_MS = 240;

/**
 * Body scroll lock shared by every overlay.
 *
 * Counted, so two overlays open at once (search over the menu) don't have the
 * first one to close hand the page its scroll back while the other is still
 * up. The padding stands in for the scrollbar that `overflow: hidden` removes
 * — without it the whole page jumps sideways by a scrollbar's width every time
 * something opens, which is most of what made the drawers feel abrupt on
 * desktop.
 */
let locks = 0;
let restore = { overflow: "", paddingRight: "" };

function lockScroll() {
  if (locks === 0) {
    const { body, documentElement } = document;
    restore = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };
    const gap = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;
  }
  locks += 1;

  return () => {
    locks -= 1;
    if (locks === 0) {
      document.body.style.overflow = restore.overflow;
      document.body.style.paddingRight = restore.paddingRight;
    }
  };
}

/**
 * The one overlay shell: cart drawer, mobile menu and search all use it.
 *
 * Rendered through a portal into `<body>`, and that is not a detail. The menu
 * and the search dialog used to be rendered inside `<header>`, which has
 * `backdrop-blur` — and a `backdrop-filter` makes an element the containing
 * block for its `position: fixed` descendants. So `fixed inset-0` was not the
 * viewport at all: it was the 64px header. The mobile menu opened as a
 * header-high sliver with its nav squeezed to zero height, which is the "menu
 * doesn't load on a phone" bug. Portalling out of the header is what fixes it,
 * and keeps it fixed whatever the header is styled with later.
 *
 * Children are only mounted while the overlay is, so any state inside them
 * (a search query, a half-typed coupon) starts clean on each open.
 */
export function Overlay({
  open,
  onClose,
  label,
  side,
  className,
  panelClassName,
  backdropClassName,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  side: Side;
  /** On the fixed wrapper — the z-index lives here. */
  className?: string;
  panelClassName?: string;
  backdropClassName?: string;
  children: React.ReactNode;
}) {
  const { mounted, visible } = usePresence(open, EXIT_MS);
  // Released the moment closing starts rather than when the exit finishes, so
  // focus is back on the trigger while the panel is still sliding away.
  const panelRef = useFocusTrap<HTMLDivElement>(open && mounted);

  useEffect(() => {
    if (!open) return;
    return lockScroll();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  const panel = PANEL[side];

  return createPortal(
    <div
      className={cn(
        // `clip`, not `hidden`: a hidden box is still scrollable from script,
        // and focusing something inside an off-screen panel would scroll it.
        "fixed inset-0 overflow-clip",
        !visible && "pointer-events-none",
        className,
      )}
    >
      <button
        type="button"
        aria-label={`Close ${label.toLowerCase()}`}
        tabIndex={-1}
        onClick={onClose}
        className={cn(
          "absolute inset-0 cursor-default bg-ink-950/40 backdrop-blur-sm transition-opacity ease-out",
          visible ? "opacity-100 duration-300" : "opacity-0 duration-200",
          backdropClassName,
        )}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          panel.base,
          "transition-[translate,scale,opacity] ease-out-soft will-change-transform",
          visible ? "duration-300" : "duration-[240ms]",
          visible ? panel.open : panel.closed,
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
