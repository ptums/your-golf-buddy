"use client";

import { useEffect, useState } from "react";
import { getGlareMode, setGlareMode, type GlareMode } from "@/lib/glare";

const NEXT: Record<GlareMode, GlareMode> = { off: "on", on: "auto", auto: "off" };
const LABEL: Record<GlareMode, string> = { off: "Glare", on: "Glare on", auto: "Glare auto" };

/** The chip on the rounds list — one tap cycles glare off → on → auto. */
export default function GlareChip() {
  const [mode, setMode] = useState<GlareMode>("off");

  useEffect(() => {
    setMode(getGlareMode());
  }, []);

  const cycle = () => {
    const next = NEXT[mode];
    setGlareMode(next);
    setMode(next);
  };

  return (
    <button
      onClick={cycle}
      className={`bs-key h-11 min-h-0 px-[14px] text-[12px] uppercase tracking-[0.12em] ${
        mode !== "off" ? "bs-key-on" : ""
      }`}
      aria-label={`Glare mode: ${mode}. Tap to change.`}
    >
      {LABEL[mode]}
    </button>
  );
}
