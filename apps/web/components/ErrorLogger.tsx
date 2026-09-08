"use client";

import { useEffect } from "react";
import { installErrorLogger } from "@/lib/error-logger";

/** Renders nothing; installs the global window error listeners once mounted. */
export default function ErrorLogger() {
  useEffect(() => installErrorLogger(), []);
  return null;
}
