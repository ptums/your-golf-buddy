import { defineConfig } from "drizzle-kit";

/**
 * Used only to *generate* migration SQL from `src/db/schema.ts`
 * (`pnpm db:generate`). Migrations are applied to D1 with
 * `wrangler d1 migrations apply` (see package.json scripts), not by drizzle-kit.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
});
