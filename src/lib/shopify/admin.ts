import "server-only";

import { ShopifyError } from "@/lib/shopify/client";
import { adminConfig } from "@/lib/shopify/env";

/**
 * Minimal Admin API client. The storefront needs the Admin API for two things
 * the Storefront API cannot do: minting staged upload targets so a customer
 * can put their own artwork into the store (stagedUpload below), and creating
 * the order for a checkout that completed on Fastrr (shopify/orders.ts).
 *
 * Never cached: nothing read or written here is safe to replay.
 */
type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

export async function admin<T>(
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

const FILE_CREATE = /* GraphQL */ `
  mutation FileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

type FileCreateResponse = {
  fileCreate: {
    files: { id: string }[] | null;
    userErrors: { field: string[] | null; message: string }[];
  };
};

/**
 * Turns a finished staged upload into a permanent file in the store.
 *
 * A staged upload on its own is a temporary object in a holding bucket: fine
 * for a few hours, gone after that. An order placed today is printed tomorrow
 * and may be reprinted next month, so the artwork has to become a real Shopify
 * file — which is also what gives it a stable cdn.shopify.com address, and puts
 * the original under Content → Files in admin for whoever does the printing.
 *
 * Shopify processes the file in the background; see getArtworkFile.
 */
export async function createArtworkFile(resourceUrl: string): Promise<string> {
  const data = await admin<FileCreateResponse>(FILE_CREATE, {
    files: [
      {
        originalSource: resourceUrl,
        contentType: "IMAGE",
        alt: "Customer artwork",
      },
    ],
  });

  const { files, userErrors } = data.fileCreate;

  if (userErrors.length) {
    throw new ShopifyError(
      userErrors.map((error) => error.message).join("; "),
      userErrors,
    );
  }

  const id = files?.[0]?.id;
  if (!id) throw new ShopifyError("Shopify returned no file");

  return id;
}

const GET_FILE = /* GraphQL */ `
  query GetFile($id: ID!) {
    node(id: $id) {
      ... on MediaImage {
        fileStatus
        fileErrors {
          message
        }
        image {
          url
        }
      }
    }
  }
`;

export type ArtworkFile =
  | { status: "ready"; url: string }
  | { status: "processing" }
  | { status: "failed"; message: string };

/** Where a file created by createArtworkFile has got to. */
export async function getArtworkFile(id: string): Promise<ArtworkFile> {
  const data = await admin<{
    node: {
      fileStatus?: string;
      fileErrors?: { message: string }[];
      image?: { url: string } | null;
    } | null;
  }>(GET_FILE, { id });

  const file = data.node;

  if (!file?.fileStatus) {
    return { status: "failed", message: "That artwork could not be found." };
  }

  if (file.fileStatus === "FAILED") {
    return {
      status: "failed",
      message: file.fileErrors?.[0]?.message ?? "Shopify could not process that image.",
    };
  }

  return file.fileStatus === "READY" && file.image?.url
    ? { status: "ready", url: file.image.url }
    : { status: "processing" };
}
