import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/integration/**/*.integration.spec.ts"],
    testTimeout: 20000,
    // Los escenarios comparten el relé con privilegios globales sobre outbox.
    // Ejecutarlos en paralelo permite que un archivo reclame eventos del otro.
    fileParallelism: false,
  },
});
