"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The count on the bag, which pops when it changes.
 *
 * Adding from a product card previously confirmed itself with a 1.2-second
 * label swap on the button you had just pressed — and on a fast connection the
 * cart drawer opened over the top of it before you noticed. The number in the
 * header is the thing that actually changed, so that is what should move.
 *
 * Keyed off the count rather than the add-to-cart call so it fires wherever the
 * cart changes: a card, the product page, the quantity stepper inside the
 * drawer. It deliberately does not animate on first paint — the badge arriving
 * with a cart restored from a previous session is not news.
 */
export function CartBadge({ count }: { count: number }) {
  const [popping, setPopping] = useState(false);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = count;

    // `null` is the first render; a decrease is a removal, which is not a
    // moment worth celebrating.
    if (before === null || count <= before) return;

    setPopping(true);
    const timer = setTimeout(() => setPopping(false), 450);
    return () => clearTimeout(timer);
  }, [count]);

  if (count <= 0) return null;

  return (
    <span
      // Re-keying on the count restarts the animation when it changes twice in
      // quick succession — without it a second add mid-animation does nothing.
      key={count}
      className={`absolute top-1 right-1 grid size-4.5 place-items-center rounded-full bg-brand-500 text-[10px] font-semibold text-white tabular-nums ${
        popping ? "animate-badge-pop" : ""
      }`}
    >
      {count}
    </span>
  );
}
