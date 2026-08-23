"use client";

import { useEffect } from "react";

import { buttonClass } from "@/components/ui";

/**
 * Route-level error boundary.
 *
 * The message is deliberately generic — `error.digest` is the only detail shown,
 * because a raw stack or exception string can leak internals to whoever hits the
 * page. The full error stays in the server logs.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[sih] render failed:", error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-[1.15rem] font-bold">Something went wrong.</h1>
        <p className="max-w-[42ch] text-[0.86rem] text-ink-3">
          The page could not be rendered. Reloading usually clears it.
        </p>
        {error.digest ? (
          <p className="font-mono text-[0.7rem] text-ink-3">
            Reference: {error.digest}
          </p>
        ) : null}
        <button type="button" onClick={reset} className={buttonClass}>
          Try again
        </button>
      </div>
    </main>
  );
}
