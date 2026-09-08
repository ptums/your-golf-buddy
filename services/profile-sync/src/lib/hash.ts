/**
 * Deterministic fallback used to build an `external_id` when the client did not
 * send a local numeric id for a row.
 *
 * The previous Laravel service used `md5(...)` here. In practice the web client
 * always sends Dexie autoincrement ids, so this path is effectively dead; a
 * 32-bit FNV-1a hex digest is enough to keep ids stable and unique and avoids
 * pulling in an MD5 implementation. If real data ever depended on the old md5
 * fallback, re-introduce md5 here.
 */
export function fallbackHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
