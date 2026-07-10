import "server-only";

import { storefrontConfig } from "@/lib/shopify/env";

export class ShopifyError extends Error {
  constructor(
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ShopifyError";
  }
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

type RequestOptions = {
  variables?: Record<string, unknown>;
  /**
   * Seconds to cache. Omit for uncached (carts, anything user-specific).
   * `fetch` is uncached by default in this Next.js version, so caching is
   * always opt-in here.
   */
  revalidate?: number;
  tags?: string[];
};

export async function storefront<T>(
  query: string,
  { variables, revalidate, tags }: RequestOptions = {},
): Promise<T> {
  const { endpoint, accessToken } = storefrontConfig();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
    ...(revalidate === undefined
      ? { cache: "no-store" as const }
      : { next: { revalidate, tags } }),
  });

  if (!response.ok) {
    throw new ShopifyError(
      `Storefront API returned ${response.status} ${response.statusText}`,
    );
  }

  // A GraphQL error still comes back as HTTP 200, so the body is the source
  // of truth for whether the request actually succeeded.
  const body = (await response.json()) as GraphQLResponse<T>;

  if (body.errors?.length) {
    throw new ShopifyError(
      body.errors.map((error) => error.message).join("; "),
      body.errors,
    );
  }

  if (!body.data) {
    throw new ShopifyError("Storefront API returned no data");
  }

  return body.data;
}
