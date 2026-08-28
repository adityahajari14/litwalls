/**
 * Real payment-network marks, not hand-drawn approximations.
 *
 * The SVGs live in `public/payments/` — official brand marks (Visa, Mastercard,
 * RuPay, UPI/NPCI), used here only to show which payment methods checkout
 * accepts, the same nominative use every storefront's payment row relies on.
 * Plain `<img>` rather than `next/image`: these are small local vector files,
 * not something that benefits from Next's raster pipeline, and `next/image`
 * refuses to optimise SVGs without loosening a security setting that isn't
 * worth changing for four static icons.
 */

function Chip({
  name,
  src,
  width,
  height,
}: {
  name: string;
  src: string;
  width: number;
  height: number;
}) {
  return (
    <span
      title={name}
      className="grid h-7 place-items-center rounded-card border border-ink-200 bg-white px-2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        width={width}
        height={height}
        className="h-4 w-auto object-contain"
      />
    </span>
  );
}

export function VisaIcon() {
  return <Chip name="Visa" src="/payments/visa.svg" width={1000} height={325} />;
}

export function MastercardIcon() {
  return (
    <Chip name="Mastercard" src="/payments/mastercard.svg" width={1000} height={618} />
  );
}

export function RupayIcon() {
  // The source file (Wikimedia) pads its mark inside a much larger white
  // canvas — the viewBox here is cropped tight to the actual logo (see
  // public/payments/rupay.svg) so it reads at the same visual size as the
  // other three marks instead of looking shrunken in the middle of its chip.
  return <Chip name="RuPay" src="/payments/rupay.svg" width={230} height={64} />;
}

export function UpiIcon() {
  return <Chip name="UPI" src="/payments/upi.svg" width={99} height={35} />;
}

export const PAYMENT_METHODS = [
  { name: "UPI", Icon: UpiIcon },
  { name: "Visa", Icon: VisaIcon },
  { name: "Mastercard", Icon: MastercardIcon },
  { name: "RuPay", Icon: RupayIcon },
];
