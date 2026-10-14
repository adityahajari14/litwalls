"use client";

import { useEffect } from "react";

/** Matches `--ease-out-soft` in globals.css. */
const EASE_OUT_SOFT = "cubic-bezier(0.22, 1, 0.36, 1)";

function supports(declaration: string) {
  return typeof CSS !== "undefined" && CSS.supports(declaration);
}

/**
 * The scroll reveal, for browsers without `animation-timeline: view()`.
 *
 * Everything already on screen (or above it) is marked revealed *before* the
 * `reveal-js` class that hides unrevealed elements is added, so nothing a
 * visitor can see ever disappears and fades back. Only content still below the
 * fold starts hidden, and it is revealed as it scrolls in.
 *
 * A MutationObserver keeps watching for new matches: client-side navigations
 * and "Load more" both add cards after this has run, and a card that is never
 * observed would stay invisible for good.
 *
 * The marker is a `data-` attribute rather than a class because React owns
 * `className` and will overwrite it on a re-render; it never touches an
 * attribute it didn't set.
 */
function startScrollReveal() {
  const SELECTOR = ".reveal, .reveal-stagger > *";
  const seen = new WeakSet<Element>();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-revealed", "");
        observer.unobserve(entry.target);
      }
    },
    // Fires a little inside the viewport, so the movement happens where it
    // can be seen rather than on the very bottom edge.
    { rootMargin: "0px 0px -6% 0px" },
  );

  const scan = () => {
    for (const element of document.querySelectorAll(SELECTOR)) {
      if (seen.has(element)) continue;
      seen.add(element);

      if (element.getBoundingClientRect().top < window.innerHeight) {
        element.setAttribute("data-revealed", "");
      } else {
        observer.observe(element);
      }
    }
  };

  scan();
  document.documentElement.classList.add("reveal-js");

  let frame = 0;
  const mutations = new MutationObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(scan);
  });
  mutations.observe(document.body, { childList: true, subtree: true });

  return () => {
    cancelAnimationFrame(frame);
    mutations.disconnect();
    observer.disconnect();
    document.documentElement.classList.remove("reveal-js");
  };
}

/**
 * Animated open/close for every `<details>` on the site, where CSS can't.
 *
 * Chromium animates these on its own through `interpolate-size` (globals.css).
 * Elsewhere a `<details>` snaps, and there is no CSS-only way round that: the
 * browser simply stops rendering the content when `open` is removed. So the
 * toggle is intercepted and the element's height is animated between its
 * measured closed and open sizes, with `open` flipped at whichever end keeps
 * the content rendered while it moves.
 *
 * Delegated from the document so it covers the FAQ, the size guide and the
 * product-page disclosures without any of them needing to opt in — and so they
 * all remain plain `<details>` that work with no script at all.
 */
function startDetailsMotion() {
  const running = new WeakMap<HTMLDetailsElement, Animation>();

  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    const target = event.target as Element | null;
    const summary = target?.closest("summary");
    const details = summary?.parentElement;
    if (!summary || !(details instanceof HTMLDetailsElement)) return;

    event.preventDefault();
    running.get(details)?.cancel();

    const opening = !details.open || details.hasAttribute("data-closing");

    // Measure both ends by briefly putting the element in each state. This
    // all happens before the next paint, so none of it is visible.
    details.open = true;
    const openHeight = details.offsetHeight;
    details.open = false;
    const closedHeight = details.offsetHeight;
    details.open = true;

    details.toggleAttribute("data-closing", !opening);
    details.style.overflow = "hidden";

    const animation = details.animate(
      {
        height: opening
          ? [`${closedHeight}px`, `${openHeight}px`]
          : [`${openHeight}px`, `${closedHeight}px`],
      },
      { duration: 280, easing: EASE_OUT_SOFT },
    );
    running.set(details, animation);

    animation.onfinish = () => {
      details.style.overflow = "";
      details.removeAttribute("data-closing");
      if (!opening) details.open = false;
      running.delete(details);
    };
    animation.oncancel = () => {
      details.style.overflow = "";
    };
  };

  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}

/**
 * Motion that CSS alone delivers in some browsers and not others, filled in
 * for the rest. Mounted once in the root layout; renders nothing.
 *
 * Each piece checks for the native feature first and stands down if it is
 * there, so no browser ever runs both versions of the same animation. All of
 * it is skipped under `prefers-reduced-motion`.
 */
export function MotionEnhancements() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cleanups: (() => void)[] = [];

    if (
      typeof IntersectionObserver !== "undefined" &&
      !supports("animation-timeline: view()")
    ) {
      cleanups.push(startScrollReveal());
    }

    if (
      !supports("interpolate-size: allow-keywords") &&
      typeof Element.prototype.animate === "function"
    ) {
      cleanups.push(startDetailsMotion());
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  return null;
}
