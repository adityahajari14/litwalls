import type { Money } from "@/lib/shopify/types";

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currencyCode: string) {
  let formatter = formatters.get(currencyCode);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    });
    formatters.set(currencyCode, formatter);
  }
  return formatter;
}

export function formatMoney(money: Money) {
  return formatterFor(money.currencyCode).format(Number(money.amount));
}

export function discountPercent(price: Money, compareAt: Money | null) {
  if (!compareAt) return 0;
  const from = Number(compareAt.amount);
  const to = Number(price.amount);
  if (!(from > to) || from <= 0) return 0;
  return Math.round(((from - to) / from) * 100);
}
