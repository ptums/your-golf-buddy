import { applyD1Migrations, env } from "cloudflare:test";
import type { D1Migration } from "@cloudflare/vitest-pool-workers";

// Runs once per test worker, before the suite. Isolated per-test storage keeps
// each test's writes separate, but the schema is shared seed state.
const { TEST_MIGRATIONS } = env as unknown as {
  TEST_MIGRATIONS: D1Migration[];
};

await applyD1Migrations(env.DB, TEST_MIGRATIONS);
