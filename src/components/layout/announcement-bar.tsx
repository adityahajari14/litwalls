import {
  FREE_SHIPPING_THRESHOLD,
  SUBSCRIBE_DISCOUNT_PERCENT,
} from "@/lib/marketing";
import { formatMoney } from "@/lib/money";

export function AnnouncementBar() {
  const threshold = formatMoney({
    amount: String(FREE_SHIPPING_THRESHOLD),
    currencyCode: "INR",
  });

  const messages = [
    {
      text: `Free shipping over ${threshold}`,
      className: "",
    },
    {
      // The same offer the popup makes, stated once up front. Someone who
      // dismissed the popup can still find the discount without being chased.
      text: `${SUBSCRIBE_DISCOUNT_PERCENT}% off your first order`,
      className: "hidden sm:flex",
    },
    { text: "Dispatched in 24 hours", className: "hidden lg:flex" },
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
