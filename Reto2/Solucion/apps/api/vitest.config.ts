import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Los e2e (test/e2e/**) requieren Postgres real y corren aparte via
    // `pnpm run test:e2e`.
    exclude: ["**/node_modules/**", "test/e2e/**"],
  },
});
