import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // The sync endpoint is baked in at build time (NEXT_PUBLIC_*). In production
  // it comes from the deploy workflow's build env. See env.example.
};

export default nextConfig;

// Lets `next dev` talk to the same bindings the Cloudflare adapter uses.
// Guarded so it never runs during `next build` (NODE_ENV === "production").
if (process.env.NODE_ENV === "development") {
  void initOpenNextCloudflareForDev();
}
