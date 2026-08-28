/**
 * The "how big is it, really?" table. Four sizes, real millimetre dimensions,
 * a one-line note on where each one works, and a bar scaled to the long edge so
 * the jump from A5 to 13″×19″ is visible at a glance.
 *
 * Dimensions kept in step with PRINT_SIZES in `src/lib/custom-poster.ts` — the
 * studio drift check compares A5/A4/A3, so these must not diverge.
 */
const SIZES = [
  { name: "A5", mm: "148 × 210 mm", long: 210, note: "Desk, or one tile in a cluster" },
  { name: "A4", mm: "210 × 297 mm", long: 297, note: "The safe default for most walls" },
  { name: "A3", mm: "297 × 420 mm", long: 420, note: "Statement size — above a bed or sofa" },
  { name: '13″ × 19″', mm: "330 × 483 mm", long: 483, note: "The largest size we print" },
];

const LONGEST = Math.max(...SIZES.map((size) => size.long));

export function SizeGuide() {
  return (
    <ul className="space-y-4">
      {SIZES.map((size) => (
        <li key={size.name} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-lg text-ink-950">{size.name}</span>
            <span className="text-sm text-ink-700">{size.mm}</span>
          </div>
          <span
            aria-hidden
            className="block h-1.5 rounded-full bg-brand-200"
            style={{ width: `${(size.long / LONGEST) * 100}%` }}
          />
          <span className="text-xs text-ink-500 text-pretty">{size.note}</span>
        </li>
      ))}
    </ul>
  );
}
