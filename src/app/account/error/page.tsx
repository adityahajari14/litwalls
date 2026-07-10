import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Sign-in failed" };

const MESSAGES: Record<string, string> = {
  invalid_state: "Your sign-in link expired. Please try again.",
  invalid_nonce: "We couldn't verify that sign-in request. Please try again.",
  token_exchange_failed: "Something went wrong signing you in. Please try again.",
  access_denied: "Sign-in was cancelled.",
};

export default async function AccountErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message = (reason && MESSAGES[reason]) || "Something went wrong signing you in.";

  return (
    <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <h1 className="font-display text-4xl text-ink-950">Sign-in failed</h1>
      <p className="mt-3 max-w-sm text-ink-600 text-pretty">{message}</p>
      <ButtonLink href="/account/login" size="lg" className="mt-8">
        Try again
      </ButtonLink>
    </Container>
  );
}
