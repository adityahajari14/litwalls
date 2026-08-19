import {
  BUNDLES,
  FIRST_ORDER_CODE,
  FIRST_ORDER_DISCOUNT,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/offers";
import { formatMoney } from "@/lib/money";

const [SMALL_BUNDLE] = BUNDLES;

export function AnnouncementBar() {
  const threshold = formatMoney({
    amount: String(FREE_SHIPPING_THRESHOLD),
    currencyCode: "INR",
  });

  const messages = [
    {
      // The bundle leads: it is the only message here that changes how much
      // someone puts in the basket rather than what they pay for it.
      text: `Buy ${SMALL_BUNDLE.pay}, get ${SMALL_BUNDLE.total}`,
      className: "",
    },
    {
      text: `Free delivery over ${threshold}`,
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
