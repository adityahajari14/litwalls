import "server-only";

import { customerAccountFetch, NotAuthenticatedError } from "@/lib/customer-account/client";
import { GET_CUSTOMER } from "@/lib/customer-account/queries";

export type OrderLineItem = {
  title: string;
  quantity: number;
  image: { url: string; altText: string | null } | null;
};

export type CustomerOrder = {
  id: string;
  name: string;
  processedAt: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  statusPageUrl: string;
  totalPrice: { amount: string; currencyCode: string };
  lineItems: { nodes: OrderLineItem[] };
};

export type Customer = {
  firstName: string | null;
  lastName: string | null;
  emailAddress: { emailAddress: string } | null;
  defaultAddress: { id: string; formatted: string[] } | null;
  orders: { nodes: CustomerOrder[] };
};

/** Returns null when signed out, rather than throwing, so pages can render a logged-out state. */
export async function getCustomer(): Promise<Customer | null> {
  try {
    const data = await customerAccountFetch<{ customer: Customer }>(GET_CUSTOMER);
    return data.customer;
  } catch (error) {
    if (error instanceof NotAuthenticatedError) return null;
    throw error;
  }
}
