"use client";

import { useEffect } from "react";
import { logClientError } from "@/lib/error-logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientError({
      message: `Render crash: ${error.message}${
        error.digest ? ` (${error.digest})` : ""
      }`,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="font-sans bg-amber-50 text-slate-950">
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-slate-600">
            The app hit an unexpected error. Your saved rounds are stored on this
            device and are safe.
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
