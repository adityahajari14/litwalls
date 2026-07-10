import "server-only";

import { customerAccountConfig } from "@/lib/shopify/env";

type OidcConfig = {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint: string;
  jwks_uri: string;
};

let cached: { config: OidcConfig; expiresAt: number } | null = null;

/** These endpoints don't change at runtime; refetching per-request would be wasteful. */
const DISCOVERY_TTL_MS = 60 * 60 * 1000;

export function customerAccountShopOrigin() {
  const { shopId } = customerAccountConfig();
  // A bare shop id is the normal case. An explicit scheme is honoured so a
  // local/staging Customer Account API mock can run over plain HTTP.
  return /^https?:\/\//.test(shopId) ? shopId.replace(/\/$/, "") : `https://${shopId}`;
}

export async function discoverOidcConfig(): Promise<OidcConfig> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config;
  }

  const origin = customerAccountShopOrigin();
  const response = await fetch(`${origin}/.well-known/openid-configuration`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to discover Customer Account OIDC config: ${response.status} ${response.statusText}`,
    );
  }

  const config = (await response.json()) as OidcConfig;
  cached = { config, expiresAt: Date.now() + DISCOVERY_TTL_MS };
  return config;
}

export function customerAccountGraphQLEndpoint(apiVersion: string) {
  return `${customerAccountShopOrigin()}/customer/api/${apiVersion}/graphql`;
}
