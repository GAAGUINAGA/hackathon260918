import { describe, expect, it } from "vitest";

describe("packages/a11y smoke test (Fase 0)", () => {
  it("carga el paquete", async () => {
    const mod = await import("../src/index.js");
    expect(mod).toBeDefined();
  });
});

describe.todo("Verificacion axe-core en CI para pantallas web (Fase 5, ADR-12)");
