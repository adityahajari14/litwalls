"use client";

import { useEffect, useState } from "react";

/**
 * Whether the app has already painted once in this tab. Module-level, so it
 * survives the template being re-created on every navigation — which is the
 * whole point of a template.
 */
let hasPainted = false;

/**
 * A short fade as each page arrives.
 *
 * Next re-mounts a template on every navigation (unlike a layout), so the
 * animation class on this wrapper replays each time the route changes. Without
 * it a page swap is an instant cut, which is most of what made moving around
 * the site feel abrupt.
 *
 * Not on the first load: that page is server-rendered and already on screen
 * before any of this runs, and fading it in would only delay the hero — the
 * largest paint on the page — for no benefit. `hasPainted` is false on the
 * server and during hydration, so the class is simply absent there and the
 * markup matches.
 *
 * Opacity only. A transform here would make this wrapper the containing block
 * for every `position: fixed` element inside a page (the sticky buy bar on a
 * product, the image lightbox) and pin them to it instead of the viewport.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const [animate] = useState(() => hasPainted);

  useEffect(() => {
    hasPainted = true;
  }, []);

  return (
    <div className={`flex flex-1 flex-col${animate ? " page-enter" : ""}`}>
      {children}
    </div>
  );
}
