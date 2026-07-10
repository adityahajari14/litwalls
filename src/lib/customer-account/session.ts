import "server-only";

import { cookies } from "next/headers";

import { refreshTokens, type TokenSet } from "@/lib/customer-account/oauth";

export const SESSION_COOKIE = "litwalls_customer_session";

/** Matches the Customer Account API's refresh token lifetime. */
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 60;

export async function createSession(tokens: TokenSet) {
  const store = await cookies();
  store.set(SESSION_COOKIE, JSON.stringify(tokens), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

function readSession(raw: string | undefined): TokenSet | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TokenSet;
    if (!parsed.accessToken || !parsed.refreshToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Returns a valid access token, transparently refreshing it if it has
 * expired. Returns null when there is no session or the refresh token itself
 * has expired — the caller should treat that as "signed out".
 */
export async function getValidAccessToken(): Promise<string | null> {
  const store = await cookies();
  const session = readSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  if (Date.now() < session.expiresAt) {
    return session.accessToken;
  }

  try {
    const refreshed = await refreshTokens(session.refreshToken);
    await createSession(refreshed);
    return refreshed.accessToken;
  } catch {
    await destroySession();
    return null;
  }
}

export async function getIdToken(): Promise<string | null> {
  const store = await cookies();
  return readSession(store.get(SESSION_COOKIE)?.value)?.idToken ?? null;
}

export async function isLoggedIn(): Promise<boolean> {
  return (await getValidAccessToken()) !== null;
}
