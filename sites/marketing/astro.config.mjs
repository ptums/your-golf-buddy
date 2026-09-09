// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Static marketing site for yourbuddy.golf. Deployed as a Cloudflare Worker
// with static assets (see wrangler.jsonc) — no adapter needed.
export default defineConfig({
  site: "https://yourbuddy.golf",
  trailingSlash: "never",
  integrations: [
    sitemap({
      // Keep non-HTML routes and the transactional /welcome page out.
      filter: (page) =>
        !/\/(og\.png|llms\.txt|llms-full\.txt|welcome)$/.test(page),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    // Emit /about.html rather than /about/index.html so the Workers assets
    // handler serves clean URLs without a trailing slash.
    format: "file",
  },
});
