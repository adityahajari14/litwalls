import type { Metadata } from "next";

import { PurchaseTracker } from "@/components/checkout/purchase-tracker";
import { CheckIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { isFastrrOrderId } from "@/lib/checkout/fastrr-api";
import { getOrderConfirmation } from "@/lib/checkout/fastrr-summary";
import { DISPATCH_HOURS, SUPPORT_EMAIL } from "@/lib/company";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = {
  title: "Order confirmed",
  // One page per order, reachable only by its id: nothing here to index.
  robots: { index: false, follow: false },
};

/**
 * Where a shopper lands after paying in the Fastrr overlay (by way of
 * /checkout/return, which retires their cart first).
 *
 * Shows only what the order id alone should unlock — see OrderConfirmation.
 * The Shopify order is created by the webhook, on its own schedule, so this
 * page neither waits for it nor quotes its number.
 */
export default async function CheckoutCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ oid?: string }>;
}) {
  const { oid } = await searchParams;
  const order = isFastrrOrderId(oid) ? await getOrderConfirmation(oid) : null;

  if (!order || order.status !== "confirmed") {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <h1 className="font-display text-4xl text-ink-950">
          {order ? "That payment didn’t go through" : "We couldn’t find that order"}
        </h1>
        <p className="mt-3 max-w-md text-ink-600 text-pretty">
          {order
            ? "Nothing has been ordered, and your cart is still saved. If money left your account, write to "
            : "If you’ve just paid, your order is safe — this page simply couldn’t load it. For anything else, write to "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>
          {isFastrrOrderId(oid) ? (
            <>
              {" "}
              with reference <span className="font-mono text-sm">{oid}</span>
            </>
          ) : null}
          .
        </p>
        <ButtonLink href="/products" size="lg" className="mt-8">
          Back to the posters
        </ButtonLink>
      </Container>
    );
  }

  const { purchase } = order;
  const expectedBy = order.expectedBy ? new Date(order.expectedBy) : null;

  return (
    <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <PurchaseTracker purchase={purchase} />

      <span className="grid size-16 place-items-center rounded-full bg-success/10 text-success">
        <CheckIcon className="size-7" />
      </span>
      <h1 className="mt-6 font-display text-4xl text-ink-950">
        Your order is confirmed
      </h1>
      <p className="mt-3 max-w-md text-ink-600 text-pretty">
        Thank you. Your posters are printed to order and dispatched within{" "}
        {DISPATCH_HOURS} hours — tracking details follow as soon as they ship.
      </p>

      <dl className="mt-8 w-full max-w-sm divide-y divide-ink-100 rounded-card border border-ink-100 text-left text-sm">
        <div className="flex items-baseline justify-between gap-4 px-5 py-3.5">
          <dt className="text-ink-600">
            {order.isCod ? "To pay on delivery" : "Paid"}
          </dt>
          <dd className="font-semibold text-ink-950">
            {formatMoney({
              amount: String(purchase.value),
              currencyCode: purchase.currency,
            })}
          </dd>
        </div>
        {expectedBy && !Number.isNaN(expectedBy.getTime()) ? (
          <div className="flex items-baseline justify-between gap-4 px-5 py-3.5">
            <dt className="text-ink-600">Expected by</dt>
            <dd className="font-medium text-ink-950">
              {expectedBy.toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                timeZone: "Asia/Kolkata",
              })}
            </dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-4 px-5 py-3.5">
          <dt className="text-ink-600">Reference</dt>
          <dd className="font-mono text-xs text-ink-700">{purchase.orderId}</dd>
        </div>
      </dl>

      <ButtonLink href="/products" size="lg" className="mt-8">
        Keep browsing
      </ButtonLink>
    </Container>
  );
}
