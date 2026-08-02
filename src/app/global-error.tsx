"use client";

import { useEffect } from "react";

/**
 * Catches a crash in the root layout itself (CartProvider, Header, Footer) —
 * the one place error.tsx can't reach, since it renders inside that layout.
 *
 * This replaces <html> and <body> entirely, so nothing from the app's normal
 * component tree can be trusted: no Tailwind classes (globals.css may be why
 * we're here), no shared UI components, no next/font. Plain inline styles
 * only, kept deliberately minimal so there's as little left to fail.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error", error.digest ?? error.message, error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "2rem",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#1c1917",
          background: "#faf9f7",
        }}
      >
        <p style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
          Litwalls
        </p>
        <h1 style={{ fontSize: "1.75rem", margin: "1rem 0 0" }}>
          Something went wrong
        </h1>
        <p style={{ maxWidth: 28 + "rem", color: "#57534e", margin: "0.75rem 0 0" }}>
          The page couldn&apos;t load. Try again, or come back in a moment.
        </p>

        {error.digest ? (
          <p style={{ fontSize: "0.75rem", color: "#a8a29e", marginTop: "1rem" }}>
            Reference: {error.digest}
          </p>
        ) : null}

        <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => unstable_retry()}
            style={{
              height: "3rem",
              padding: "0 1.75rem",
              borderRadius: "9999px",
              border: "none",
              background: "#ff6a00",
              color: "#fff",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {/* Plain <a>, not next/link: this boundary exists because the app's
              own tree may be broken, so it must not depend on the router. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              height: "3rem",
              padding: "0 1.75rem",
              borderRadius: "9999px",
              border: "1px solid #e7e5e4",
              display: "inline-flex",
              alignItems: "center",
              color: "#1c1917",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  );
}
