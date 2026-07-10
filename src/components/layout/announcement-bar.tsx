const MESSAGES = [
  { text: "Free shipping over ₹499", className: "" },
  { text: "7-day easy returns", className: "hidden sm:flex" },
  { text: "300gsm museum-grade matte", className: "hidden lg:flex" },
];

export function AnnouncementBar() {
  return (
    <div className="bg-ink-950 text-white">
      <div className="mx-auto flex h-10 max-w-7xl items-center justify-center px-4">
        <ul className="flex items-center gap-4 text-xs font-medium sm:gap-6 sm:text-[13px]">
          {MESSAGES.map((message, index) => (
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
