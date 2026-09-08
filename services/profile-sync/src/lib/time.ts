/** Single source of "now" for the service, as an ISO-8601 string (UTC, ms precision). */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Normalise any timestamp the DB or an import might hold into the same
 * ISO-8601 shape used for cursors. Accepts ISO strings and the legacy
 * Laravel `YYYY-MM-DD HH:MM:SS` format.
 */
export function toIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalised = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  const d = new Date(normalised);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
