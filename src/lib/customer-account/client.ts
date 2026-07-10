import "server-only";

import { customerAccountGraphQLEndpoint } from "@/lib/customer-account/discovery";
import { getValidAccessToken } from "@/lib/customer-account/session";
import { CUSTOMER_ACCOUNT_API_VERSION } from "@/lib/shopify/env";

export class CustomerAccountError extends Error {
  constructor(
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "CustomerAccountError";
  }
}

/** Thrown when there is no valid session; callers should redirect to login. */
export class NotAuthenticatedError extends CustomerAccountError {
  constructor() {
    super("No valid customer session");
    this.name = "NotAuthenticatedError";
  }
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

export async function customerAccountFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new NotAuthenticatedError();

  const endpoint = customerAccountGraphQLEndpoint(CUSTOMER_ACCOUNT_API_VERSION);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Per Shopify's docs this is the raw token, not a "Bearer " prefix.
      Authorization: accessToken,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new CustomerAccountError(
      `Customer Account API returned ${response.status} ${response.statusText}`,
    );
  }

  const body = (await response.json()) as GraphQLResponse<T>;

  if (body.errors?.length) {
    throw new CustomerAccountError(
      body.errors.map((error) => error.message).join("; "),
      body.errors,
    );
  }

  if (!body.data) {
    throw new CustomerAccountError("Customer Account API returned no data");
  }

  return body.data;
}
