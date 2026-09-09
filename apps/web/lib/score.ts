// Derived scoring — compute, never store (design handoff, State management).

export interface HoleEntry {
  par: string;
  score: string;
  putts: number | null;
}

const toNum = (s: string) => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
};

/** Sum of entered strokes. */
export function runningTotal(entries: HoleEntry[]): number {
  return entries.reduce((sum, e) => sum + toNum(e.score), 0);
}

/** How many holes have a stroke count entered. */
export function thruCount(entries: HoleEntry[]): number {
  return entries.filter((e) => toNum(e.score) > 0).length;
}

/** Strokes-vs-par across the holes played so far, e.g. -1, 0, +4. */
export function scoreToPar(entries: HoleEntry[]): number {
  return entries.reduce((d, e) => {
    const s = toNum(e.score);
    const p = toNum(e.par);
    return s > 0 && p > 0 ? d + (s - p) : d;
  }, 0);
}

/** "+4" / "E" / "-2" — for the rail line. */
export function formatDelta(delta: number): string {
  if (delta === 0) return "E";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

/**
 * The score-name flag relative to par: Eagle, Birdie, Par, Bogey, Double, +3…
 * Returns null when there's no stroke count to name yet.
 */
export function scoreName(strokes: number, par: number): string | null {
  if (!strokes || strokes <= 0) return null;
  if (!par || par <= 0) return null;
  const d = strokes - par;
  if (d <= -3) return "Albatross";
  if (d === -2) return "Eagle";
  if (d === -1) return "Birdie";
  if (d === 0) return "Par";
  if (d === 1) return "Bogey";
  if (d === 2) return "Double";
  return `+${d}`;
}
