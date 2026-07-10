import "server-only";

import { randomBytes } from "node:crypto";

import { customerAccountConfig } from "@/lib/shopify/env";
import { discoverOidcConfig } from "@/lib/customer-account/discovery";

export type TokenSet = {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  /** Absolute epoch-ms expiry, computed from the response's `expires_in`. */
  expiresAt: number;
};

export function randomToken() {
  return randomBytes(24).toString("base64url");
}

export async function buildAuthorizationUrl({
  state,
  nonce,
}: {
  state: string;
  nonce: string;
}) {
  const { clientId, redirectUri } = customerAccountConfig();
  const { authorization_endpoint } = await discoverOidcConfig();

  const url = new URL(authorization_endpoint);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "openid email customer-account-api:full");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);

  return url.toString();
}

function basicAuthHeader() {
  const { clientId, clientSecret } = customerAccountConfig();
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

function toTokenSet(body: {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
}): TokenSet {
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    idToken: body.id_token,
    // Shave 60s off so a token doesn't expire mid-request.
    expiresAt: Date.now() + (body.expires_in - 60) * 1000,
  };
}

export async function exchangeCodeForTokens(code: string): Promise<TokenSet> {
  const { clientId, redirectUri } = customerAccountConfig();
  const { token_endpoint } = await discoverOidcConfig();

  const response = await fetch(token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Customer Account token exchange failed: ${response.status} ${await response.text()}`,
    );
  }

  return toTokenSet(await response.json());
}

export async function refreshTokens(refreshToken: string): Promise<TokenSet> {
  const { clientId } = customerAccountConfig();
  const { token_endpoint } = await discoverOidcConfig();

  const response = await fetch(token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Customer Account token refresh failed: ${response.status} ${await response.text()}`,
    );
  }

  return toTokenSet(await response.json());
}

export async function buildLogoutUrl(idToken: string, postLogoutRedirectUri: string) {
  const { end_session_endpoint } = await discoverOidcConfig();

  const url = new URL(end_session_endpoint);
  url.searchParams.set("id_token_hint", idToken);
  url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);

  return url.toString();
}
