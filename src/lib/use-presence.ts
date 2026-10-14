"use client";

import { useEffect, useState } from "react";

/**
 * Keeps something mounted long enough to animate out.
 *
 * Every overlay on the site used to be `{open ? <Panel /> : null}`, with
 * `@starting-style` for the way in. That gave an entrance in the browsers that
 * support it and no exit anywhere: closing the cart or the menu simply removed
 * it from the page, which is what "opens and closes abruptly" looks like.
 *
 * `mounted` says whether to render at all; `visible` is what the open/closed
 * classes key off. Opening mounts first and flips `visible` a frame later, so
 * the closed styles are painted before the transition starts. Closing flips
 * `visible` immediately and unmounts once the exit has had time to play.
 *
 * @param exitMs How long the exit transition runs. Unmounting sooner cuts it
 *   off; later just leaves an invisible node around a little longer.
 */
export function usePresence(open: boolean, exitMs = 260) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  // Adjusted during render rather than in an effect: both are derived from
  // `open`, and doing it here saves the extra committed frame an effect costs.
  if (open && !mounted) setMounted(true);
  if (!open && visible) setVisible(false);

  useEffect(() => {
    if (open) {
      // Two frames, not one: the first commits the closed styles, the second
      // is the earliest point a change is guaranteed to transition from them.
      let second = 0;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }

    if (!mounted) return;
    const timer = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(timer);
  }, [open, mounted, exitMs]);

  return { mounted, visible };
}
