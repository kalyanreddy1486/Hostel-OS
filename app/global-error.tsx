"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global:error]", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <div
          style={{
            maxWidth: 480,
            margin: "4rem auto",
            padding: "1.5rem",
            border: "1px solid #e5e5e5",
            borderRadius: 12,
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
            The application hit an unexpected error and could not render the
            page.
          </p>
          <pre
            style={{
              fontSize: 12,
              background: "#fef2f2",
              color: "#b91c1c",
              padding: 12,
              borderRadius: 8,
              whiteSpace: "pre-wrap",
              marginBottom: 16,
            }}
          >
            {error.message}
            {error.digest ? `\n\nRef: ${error.digest}` : ""}
          </pre>
          <button
            onClick={reset}
            style={{
              background: "#111827",
              color: "white",
              border: 0,
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
