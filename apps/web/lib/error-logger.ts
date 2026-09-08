// Ships uncaught client errors to profile-sync's POST /log sink (Analytics
// Engine). Fire-and-forget, deduped, and capped so a render loop can't spam it.

const ENDPOINT =
  (process.env.NEXT_PUBLIC_SYNC_ENDPOINT || "http://localhost:8000/api").replace(
    /\/$/,
    "",
  ) + "/log";

const SESSION_CAP = 20;
const DEDUPE_MS = 10_000;

let sent = 0;
const recent = new Map<string, number>();
let installed = false;

type LogInput = {
  message: string;
  stack?: string;
  level?: "error" | "warn" | "info";
};

export function logClientError(input: LogInput): void {
  if (typeof window === "undefined") return;
  const message = input.message?.trim();
  if (!message || sent >= SESSION_CAP) return;

  const now = Date.now();
  const last = recent.get(message);
  if (last && now - last < DEDUPE_MS) return;
  recent.set(message, now);
  sent += 1;

  const body = JSON.stringify({
    message: message.slice(0, 500),
    stack: input.stack?.slice(0, 2000),
    level: input.level ?? "error",
    url: window.location.href,
  });

  try {
    if (navigator.sendBeacon) {
      // text/plain keeps this a CORS-simple request (no preflight); the Worker
      // parses the body as JSON regardless of content-type.
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain" }));
      return;
    }
  } catch {
    // fall through to fetch
  }
  void fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function installErrorLogger(): () => void {
  if (typeof window === "undefined" || installed) return () => {};
  installed = true;

  const onError = (e: ErrorEvent) => {
    logClientError({
      message: e.message || String(e.error ?? "Unknown error"),
      stack: e.error instanceof Error ? e.error.stack : undefined,
    });
  };
  const onRejection = (e: PromiseRejectionEvent) => {
    const reason = e.reason;
    logClientError({
      message:
        reason instanceof Error
          ? reason.message
          : `Unhandled rejection: ${String(reason)}`,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    installed = false;
  };
}
