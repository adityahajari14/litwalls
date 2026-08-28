import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { formatMoney } from "@/lib/money";
import { getCustomer } from "@/lib/customer-account/customer";
import type { CustomerOrder } from "@/lib/customer-account/customer";

export const metadata: Metadata = { title: "Your account" };

function statusLabel(order: CustomerOrder) {
  const fulfillment = order.fulfillmentStatus?.toLowerCase().replace(/_/g, " ");
  return fulfillment || "processing";
}

function OrderRow({ order }: { order: CustomerOrder }) {
  const items = order.lineItems.nodes;
  const extra = items.length > 3 ? items.length - 3 : 0;

  return (
    <li className="flex flex-col gap-4 border-b border-ink-100 py-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex -space-x-3">
          {items.slice(0, 3).map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className="relative size-14 overflow-hidden rounded-card bg-ink-100 ring-2 ring-white"
            >
              {item.image ? (
                <Image
                  src={item.image.url}
                  alt={item.image.altText ?? item.title}
                  fill
                  sizes="3.5rem"
                  className="object-cover"
                />
              ) : null}
            </div>
          ))}
          {extra > 0 ? (
            <div className="grid size-14 place-items-center rounded-card bg-ink-100 text-xs font-medium text-ink-600 ring-2 ring-white">
              +{extra}
            </div>
          ) : null}
        </div>

        <div>
          <p className="font-medium text-ink-900">{order.name}</p>
          <p className="text-sm text-ink-500">
            {new Date(order.processedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {" · "}
            <span className="capitalize">{statusLabel(order)}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1">
        <p className="font-semibold text-ink-950">{formatMoney(order.totalPrice)}</p>
        <a
          href={order.statusPageUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-brand-600 underline underline-offset-4"
        >
          Track order
        </a>
      </div>
    </li>
  );
}

export default async function AccountPage() {
  const customer = await getCustomer();

  if (!customer) {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <h1 className="font-display text-4xl text-ink-950">Your account</h1>
        <p className="mt-3 max-w-sm text-ink-600 text-pretty">
          Sign in to see your order history and manage your addresses.
        </p>
        <ButtonLink href="/account/login" size="lg" className="mt-8">
          Sign in
        </ButtonLink>
      </Container>
    );
  }

  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
  const orders = customer.orders.nodes;

  return (
    <Container className="py-12 lg:py-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl text-ink-950 sm:text-6xl">
            {name || "Your account"}
          </h1>
          {customer.emailAddress ? (
            <p className="mt-2 text-ink-600">{customer.emailAddress.emailAddress}</p>
          ) : null}
        </div>
        <Link
          href="/account/logout"
          className="text-sm font-medium text-ink-600 underline underline-offset-4 hover:text-ink-900"
        >
          Sign out
        </Link>
      </header>

      {customer.defaultAddress ? (
        <div className="mt-8 rounded-card border border-ink-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-ink-950">Default address</h2>
          <p className="mt-2 text-sm text-ink-600">
            {customer.defaultAddress.formatted.join(", ")}
          </p>
        </div>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-3xl text-ink-950">Order history</h2>

        {orders.length === 0 ? (
          <div className="mt-6">
            <p className="text-ink-600">You haven&apos;t placed an order yet.</p>
            <ButtonLink href="/products" variant="ghost" className="mt-4">
              Browse posters
            </ButtonLink>
          </div>
        ) : (
          <ul className="mt-4 border-t border-ink-100">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
