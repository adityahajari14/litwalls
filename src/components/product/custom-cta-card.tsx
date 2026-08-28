import Link from "next/link";

import { ArrowRightIcon, ImageIcon } from "@/components/icons";
import { ENTRY_PRICE } from "@/lib/pricing";

/**
 * A compact cross-sell into the custom-print flow, sat in the buy rail. Any
 * poster page is a fair place to catch someone who came for a design we don't
 * have — they can bring their own. Kept off the custom products' own pages,
 * where it would point back at where you already are.
 */
export function CustomCtaCard() {
  return (
    <Link
      href="/custom"
      className="group flex items-center gap-4 rounded-card bg-ink-950 p-4 text-white transition-colors hover:bg-ink-900"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-card bg-white/10">
        <ImageIcon className="size-5 text-brand-400" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold tracking-[0.15em] text-brand-400 uppercase">
          Your photo, printed
        </span>
        <span className="block font-semibold">Create your custom poster</span>
        <span className="block text-xs text-ink-300">
          Upload any image · from ₹{ENTRY_PRICE}
        </span>
      </span>

      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-500 text-white transition-transform duration-200 group-hover:translate-x-0.5">
        <ArrowRightIcon className="size-4" />
      </span>
    </Link>
  );
}
