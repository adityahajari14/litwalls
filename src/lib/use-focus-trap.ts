"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Keeps Tab inside an overlay, and puts focus back where it came from.
 *
 * All four overlays on this site — cart, mobile menu, search, the subscribe
 * popup — locked body scroll and set `aria-modal`, then let Tab walk straight
 * into the page behind them. For a keyboard or screen-reader user that means
 * being stranded in a page they cannot see, with no way back to the dialog
 * except tabbing through the entire document.
 *
 * Returns a ref to attach to the overlay's container element.
 *
 * @param active Whether the trap is engaged. Passing `false` restores focus.
 * @param onEscape Optional — most overlays already bind Escape themselves.
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  onEscape?: () => void,
) {
  const containerRef = useRef<T>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    // Remembered before focus moves, so closing returns the shopper to the
    // button they opened the overlay with rather than the top of the page.
    restoreRef.current = document.activeElement as HTMLElement | null;

    const focusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) =>
          !element.hasAttribute("inert") &&
          element.offsetParent !== null,
      );

    // Focus the first control rather than the container: a dialog that opens
    // with nothing focused leaves the next Tab going to whatever followed the
    // trigger in the document, which is the bug this exists to prevent.
    //
    // `data-autofocus` lets an overlay name a better starting point than
    // whatever happens to come first — the search field, not the button
    // beside it. `preventScroll` because the panel is usually still
    // off-screen mid-transition, and the browser would otherwise try to
    // scroll it into view.
    const initial =
      container.querySelector<HTMLElement>("[data-autofocus]") ?? focusable()[0];
    if (initial) {
      initial.focus({ preventScroll: true });
    } else {
      container.setAttribute("tabindex", "-1");
      container.focus({ preventScroll: true });
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onEscape) {
        onEscape();
        return;
      }
      if (event.key !== "Tab") return;

      const elements = focusable();
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const current = document.activeElement;

      // Wrap in both directions, and pull focus back in if it has already
      // escaped (a click on the page behind, say).
      if (event.shiftKey && (current === first || !container.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !container.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      // `container` is the node captured when the trap was set up, not
      // `containerRef.current` — by cleanup the ref has usually been nulled by
      // React, and reading it there would make the check below always take the
      // "no container" branch and steal focus unconditionally.
      //
      // Only restore if focus is still inside the overlay being torn down:
      // a close triggered by clicking somewhere else on the page would
      // otherwise yank focus away from wherever the shopper just put it.
      const restore = restoreRef.current;
      if (restore && container.contains(document.activeElement)) {
        restore.focus?.();
      }
    };
  }, [active, onEscape]);

  return containerRef;
}
