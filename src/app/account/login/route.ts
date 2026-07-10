import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildAuthorizationUrl, randomToken } from "@/lib/customer-account/oauth";

export const OAUTH_STATE_COOKIE = "litwalls_oauth_state";
export const OAUTH_NONCE_COOKIE = "litwalls_oauth_nonce";

/** Long enough to cover a slow login, short enough not to linger. */
const OAUTH_COOKIE_MAX_AGE = 60 * 10;

export async function GET() {
  const state = randomToken();
  const nonce = randomToken();

  const url = await buildAuthorizationUrl({ state, nonce });

  const store = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE,
  };
  store.set(OAUTH_STATE_COOKIE, state, cookieOptions);
  store.set(OAUTH_NONCE_COOKIE, nonce, cookieOptions);

  return NextResponse.redirect(url);
}
