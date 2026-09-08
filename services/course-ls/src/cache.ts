import type { CourseSearchResult } from "@ygb/shared";

/**
 * Two-tier cache tuned for typeahead latency:
 *
 *   1. Cloudflare Cache API (`caches.default`) — per-colo, sub-millisecond.
 *      First stop; most repeat keystrokes in a region never leave the edge.
 *   2. Workers KV — globally replicated, a few ms. Catches the case where a
 *      colo is cold but the query is popular somewhere.
 *
 * Both store the same JSON blob with a `storedAt` stamp so the handler can do
 * stale-while-revalidate: serve immediately, refresh in the background.
 */

const EDGE_TTL_S = 3_600; // Cache API entry lifetime
const KV_TTL_S = 7 * 24 * 3_600; // KV entry lifetime — courses barely change
const FRESH_MS = 15 * 60 * 1_000; // newer than this ⇒ no background refresh

interface StoredPayload {
  results: CourseSearchResult[];
  storedAt: number;
}

export interface CacheHit {
  results: CourseSearchResult[];
  source: "edge" | "kv";
  stale: boolean;
}

function edgeRequest(key: string): Request {
  return new Request(
    `https://course-ls.cache.internal/${encodeURIComponent(key)}`,
  );
}

export async function readCache(
  key: string,
  kv: KVNamespace | undefined,
): Promise<CacheHit | null> {
  const edgeHit = await caches.default.match(edgeRequest(key));
  if (edgeHit) {
    const payload = (await edgeHit.json()) as StoredPayload;
    return {
      results: payload.results,
      source: "edge",
      stale: Date.now() - payload.storedAt > FRESH_MS,
    };
  }

  if (kv) {
    const payload = await kv.get<StoredPayload>(key, "json");
    if (payload) {
      return {
        results: payload.results,
        source: "kv",
        stale: Date.now() - payload.storedAt > FRESH_MS,
      };
    }
  }

  return null;
}

interface WriteOptions {
  /** Skip the KV write (used to warm the edge from a KV hit). */
  edgeOnly?: boolean;
}

export async function writeCache(
  key: string,
  results: CourseSearchResult[],
  kv: KVNamespace | undefined,
  opts: WriteOptions = {},
): Promise<void> {
  const body = JSON.stringify({
    results,
    storedAt: Date.now(),
  } satisfies StoredPayload);

  const writes: Promise<unknown>[] = [
    caches.default.put(
      edgeRequest(key),
      new Response(body, {
        headers: {
          "content-type": "application/json",
          "cache-control": `public, max-age=${EDGE_TTL_S}`,
        },
      }),
    ),
  ];

  if (kv && !opts.edgeOnly) {
    writes.push(kv.put(key, body, { expirationTtl: KV_TTL_S }));
  }

  await Promise.all(writes);
}
