export function Accordion({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <div className="divide-y divide-ink-200 border-y border-ink-200">
      {items.map((item) => (
        <details key={item.question} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left font-medium text-ink-900 transition-colors hover:text-brand-600 [&::-webkit-details-marker]:hidden">
            {item.question}
            <svg
              viewBox="0 0 20 20"
              aria-hidden
              className="size-5 shrink-0 text-ink-400 transition-transform duration-300 group-open:rotate-45"
            >
              <path
                d="M10 4v12M4 10h12"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </summary>
          <p className="pb-5 text-ink-600 text-pretty">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
