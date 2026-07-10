/**
 * Decodes (does not verify the signature of) an id_token's payload.
 *
 * Signature verification is unnecessary here: the token arrives directly
 * from Shopify's token endpoint over a server-to-server TLS connection, not
 * from a value a client could forge. Decoding is only needed to read the
 * `nonce` claim back out and confirm it matches what we sent.
 */
export function decodeIdTokenPayload(idToken: string): Record<string, unknown> {
  const [, payload] = idToken.split(".");
  if (!payload) throw new Error("Malformed id_token");

  const json = Buffer.from(payload, "base64url").toString("utf8");
  return JSON.parse(json);
}
