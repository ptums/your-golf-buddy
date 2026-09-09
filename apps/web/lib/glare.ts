// Glare mode — bigger type, ink only, taller keys. A user-level setting,
// persisted and sticky across rounds. See app/globals.css for the token
// overrides that `data-glare="on"` on <html> triggers.

export type GlareMode = "on" | "off" | "auto";

export const GLARE_KEY = "golf_buddy_glare";

/** `auto` follows screen brightness where the platform exposes it (rare on the
 *  web); otherwise it falls back to off, per the handoff. */
export function resolveGlare(mode: GlareMode): "on" | "off" {
  if (mode !== "auto") return mode;
  try {
    // AmbientLightSensor is behind a flag on most browsers; treat a very low
    // reading as "outdoors is bright, the screen is fighting it" is not
    // possible synchronously, so auto resolves to off until that lands.
    return "off";
  } catch {
    return "off";
  }
}

export function getGlareMode(): GlareMode {
  if (typeof window === "undefined") return "auto";
  try {
    const v = localStorage.getItem(GLARE_KEY);
    return v === "on" || v === "off" || v === "auto" ? v : "auto";
  } catch {
    return "auto";
  }
}

export function applyGlare(mode: GlareMode): void {
  if (typeof document === "undefined") return;
  const resolved = resolveGlare(mode);
  document.documentElement.dataset.glare = resolved;
}

export function setGlareMode(mode: GlareMode): void {
  try {
    localStorage.setItem(GLARE_KEY, mode);
  } catch {
    /* private mode — the choice just won't stick */
  }
  applyGlare(mode);
}

/** Inline <script> body — runs before paint so there's no flash of the wrong
 *  mode. Mirrors the logic above without importing it. */
export const GLARE_INIT_SCRIPT = `
try {
  var m = localStorage.getItem(${JSON.stringify(GLARE_KEY)}) || "auto";
  document.documentElement.dataset.glare = m === "on" ? "on" : "off";
} catch (e) {
  document.documentElement.dataset.glare = "off";
}
`.trim();
