import type { Metadata } from "next";

import { ProsePage } from "@/components/ui/prose-page";
import {
  DAMAGE_PROOF,
  DISPATCH_HOURS,
  FLAT_SHIPPING_FEE,
  REPLACEMENT_WINDOW_DAYS,
  SUPPORT_EMAIL,
} from "@/lib/company";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Shipping",
  description: `Free shipping over ₹${FREE_SHIPPING_THRESHOLD}, flat ₹${FLAT_SHIPPING_FEE} below that. Dispatched within ${DISPATCH_HOURS} hours, anywhere in India.`,
};

export default function ShippingPage() {
  return (
    <ProsePage
      title="Shipping"
      intro="Printed to order, dispatched fast, tracked the whole way."
      updated="14 July 2026"
    >
      <h2>What it costs</h2>
      <ul>
        <li>
          <span>
            <strong>Free</strong> on orders over ₹{FREE_SHIPPING_THRESHOLD}.
          </span>
        </li>
        <li>
          <span>
            <strong>Flat ₹{FLAT_SHIPPING_FEE}</strong> below that, anywhere in
            India.
          </span>
        </li>
      </ul>
      <p>
        That&apos;s the whole of it. Nothing is added at checkout that
        wasn&apos;t on the product page.
      </p>

      <h2>How long it takes</h2>
      <p>
        Your poster is printed after you order it, so there are two clocks:
        printing and shipping.
      </p>
      <ul>
        <li>
          <span>
            <strong>Dispatch:</strong> within {DISPATCH_HOURS} hours of your
            order. Orders placed late in the day go out the next morning.
          </span>
        </li>
        <li>
          <span>
            <strong>Metro cities:</strong> typically 3–4 days after dispatch.
          </span>
        </li>
        <li>
          <span>
            <strong>Rest of India:</strong> typically 4–7 days after dispatch.
          </span>
        </li>
      </ul>
      <p>
        The delivery estimate we show on the product page already accounts for
        both, including weekends — couriers don&apos;t move on Sunday, and we
        don&apos;t pretend they do.
      </p>

      <h2>Tracking</h2>
      <p>
        You&apos;ll get a tracking link by email and SMS the moment your order
        ships. You can also find it any time on your{" "}
        <a href="/account">account page</a>.
      </p>

      <h2>How it&apos;s packed</h2>
      <p>
        Posters ship rolled in a rigid cardboard tube, not folded in an
        envelope. A folded poster has a crease down the middle forever; a rolled
        one relaxes flat within a day of being out of the tube.
      </p>

      <h2>Where we ship</h2>
      <p>
        Anywhere in India. We don&apos;t ship internationally yet — if
        you&apos;re outside India and want one, email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we&apos;ll
        tell you honestly whether we can make it work.
      </p>

      <h2>If it arrives damaged</h2>
      <p>
        Send us {DAMAGE_PROOF} within {REPLACEMENT_WINDOW_DAYS} days and we&apos;ll
        reprint and reship it free. Full details on the{" "}
        <a href="/returns">returns page</a>.
      </p>
    </ProsePage>
  );
}
