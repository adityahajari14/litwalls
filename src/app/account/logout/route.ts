import { NextResponse } from "next/server";

import { buildLogoutUrl } from "@/lib/customer-account/oauth";
import { destroySession, getIdToken } from "@/lib/customer-account/session";

export async function GET(request: Request) {
  const idToken = await getIdToken();
  await destroySession();

  if (!idToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const postLogoutRedirectUri = new URL("/", request.url).toString();
  const logoutUrl = await buildLogoutUrl(idToken, postLogoutRedirectUri);

  return NextResponse.redirect(logoutUrl);
}
