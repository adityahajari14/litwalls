import { LockIcon } from "@/components/icons";
import { PAYMENT_METHODS } from "@/components/payment-icons";

/** Payment reassurance directly under the buy button — a lock, "Secure
 *  checkout", and the marks a shopper actually scans for before paying. */
export function PaymentMarks() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-600">
        <LockIcon className="size-3.5 text-ink-400" />
        Secure checkout
      </p>
      <ul className="flex flex-wrap items-center gap-1.5">
        {PAYMENT_METHODS.map(({ name, Icon }) => (
          <li key={name} title={name}>
            <Icon />
          </li>
        ))}
      </ul>
    </div>
  );
}
