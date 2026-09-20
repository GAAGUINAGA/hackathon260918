import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Las pruebas de integración (test/integration/**) requieren Postgres
    // real y corren aparte via `pnpm run test:integration`.
    exclude: ["**/node_modules/**", "test/integration/**"],
  },
});
