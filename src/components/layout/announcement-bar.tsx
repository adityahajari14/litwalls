import {
  FIRST_ORDER_CODE,
  FIRST_ORDER_DISCOUNT,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/offers";
import { formatMoney } from "@/lib/money";
import { DISPATCH_HOURS } from "@/lib/company";

export function AnnouncementBar() {
  const threshold = formatMoney({
    amount: String(FREE_SHIPPING_THRESHOLD),
    currencyCode: "INR",
  });

  const messages = [
    // Free delivery leads. It is the only one of these that applies to every
    // visitor on every order, and the one most likely to be the thing that
    // decides whether a ₹149 poster is worth the postage.
    {
      text: `Free delivery over ${threshold}`,
      className: "",
    },
    // A fulfilment promise rather than a third discount: the bar reads as pure
    // promo when all three slots are money off, and this is the claim in the
    // set that a competitor has to actually match rather than just undercut.
    {
      text: `Dispatched within ${DISPATCH_HOURS} hours`,
      className: "hidden sm:flex",
    },
    {
      text: `₹${FIRST_ORDER_DISCOUNT} off your first order with ${FIRST_ORDER_CODE}`,
      className: "hidden lg:flex",
    },
  ];

  return (
    <div className="bg-ink-950 text-white">
      <div className="mx-auto flex h-10 max-w-7xl items-center justify-center px-4">
        <ul className="flex items-center gap-4 text-xs font-medium sm:gap-6 sm:text-[13px]">
          {messages.map((message, index) => (
            <li
              key={message.text}
              className={`flex items-center gap-4 sm:gap-6 ${message.className}`}
            >
              {/* The separator belongs to the item that follows it, so hiding
                  an item at a breakpoint hides its divider along with it. */}
              {index > 0 ? (
                <span aria-hidden className="h-3.5 w-px shrink-0 bg-ink-700" />
              ) : null}
              {message.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
