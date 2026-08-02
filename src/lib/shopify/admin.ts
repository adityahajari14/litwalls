import "server-only";

import { ShopifyError } from "@/lib/shopify/client";
import { adminConfig } from "@/lib/shopify/env";

/**
 * Minimal Admin API client. The only thing the storefront needs the Admin API
 * for is minting staged upload targets so a customer can put their own artwork
 * into the store — see stagedUpload below.
 *
 * Never cached: every response here is a single-use, expiring credential.
 */
type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

async function admin<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const { endpoint, accessToken } = adminConfig();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ShopifyError(
      `Admin API returned ${response.status} ${response.statusText}`,
    );
  }

  const body = (await response.json()) as GraphQLResponse<T>;

  if (body.errors?.length) {
    throw new ShopifyError(
      body.errors.map((error) => error.message).join("; "),
      body.errors,
    );
  }

  if (!body.data) {
    throw new ShopifyError("Admin API returned no data");
  }

  return body.data;
}

const STAGED_UPLOADS_CREATE = /* GraphQL */ `
  mutation StagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export type StagedTarget = {
  /** Where the browser POSTs the file — Shopify's storage, not our server. */
  url: string;
  /** Where the file will live once uploaded. This is what goes on the cart line. */
  resourceUrl: string;
  /** Signed auth fields that must be sent as form fields, before the file. */
  parameters: { name: string; value: string }[];
};

type StagedUploadsCreateResponse = {
  stagedUploadsCreate: {
    stagedTargets: StagedTarget[];
    userErrors: { field: string[] | null; message: string }[];
  };
};

/**
 * Mints a one-shot, pre-signed target the browser can upload directly to.
 *
 * The file never passes through this server. That is not just an optimisation:
 * Server Actions cap request bodies at 1MB by default, and a print-resolution
 * poster is comfortably 10–20MB. Routing the bytes around our own backend also
 * means we pay no bandwidth for them and hold no customer artwork at rest.
 *
 * The returned credential is short-lived and scoped to this one file, so it is
 * safe to hand to the browser — unlike the admin token that created it.
 */
export async function createStagedUpload({
  filename,
  mimeType,
  fileSize,
}: {
  filename: string;
  mimeType: string;
  fileSize: number;
}): Promise<StagedTarget> {
  const data = await admin<StagedUploadsCreateResponse>(STAGED_UPLOADS_CREATE, {
    input: [
      {
        // FILE, not PRODUCT_IMAGE: this artwork belongs to an order, not to
        // the catalogue. It must not surface as a product photo anywhere.
        resource: "FILE",
        filename,
        mimeType,
        fileSize: String(fileSize),
        httpMethod: "POST",
      },
    ],
  });

  const { stagedTargets, userErrors } = data.stagedUploadsCreate;

  if (userErrors.length) {
    throw new ShopifyError(
      userErrors.map((error) => error.message).join("; "),
      userErrors,
    );
  }

  const target = stagedTargets[0];
  if (!target) {
    throw new ShopifyError("Shopify returned no upload target");
  }

  return target;
}
