import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  OAUTH_NONCE_COOKIE,
  OAUTH_STATE_COOKIE,
} from "@/app/account/login/route";
import { decodeIdTokenPayload } from "@/lib/customer-account/id-token";
import { exchangeCodeForTokens } from "@/lib/customer-account/oauth";
import { createSession } from "@/lib/customer-account/session";

function redirectToLoginError(request: Request, reason: string) {
  const url = new URL("/account/error", request.url);
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const store = await cookies();
  const expectedState = store.get(OAUTH_STATE_COOKIE)?.value;
  const expectedNonce = store.get(OAUTH_NONCE_COOKIE)?.value;

  // Consume the one-time cookies regardless of outcome.
  store.delete(OAUTH_STATE_COOKIE);
  store.delete(OAUTH_NONCE_COOKIE);

  if (errorParam) {
    return redirectToLoginError(request, errorParam);
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToLoginError(request, "invalid_state");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    const nonce = decodeIdTokenPayload(tokens.idToken).nonce;
    if (!expectedNonce || nonce !== expectedNonce) {
      return redirectToLoginError(request, "invalid_nonce");
    }

    await createSession(tokens);
  } catch (error) {
    console.error("Customer Account token exchange failed", error);
    return redirectToLoginError(request, "token_exchange_failed");
  }

  return NextResponse.redirect(new URL("/account", request.url));
}
