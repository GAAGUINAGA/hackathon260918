import { defineConfig } from "vitest/config";

// Herramientas de generación (no son pruebas): corren aparte del `test`
// normal y de los e2e.
export default defineConfig({
  test: {
    include: ["scripts/**/*.tool.ts"],
  },
});
