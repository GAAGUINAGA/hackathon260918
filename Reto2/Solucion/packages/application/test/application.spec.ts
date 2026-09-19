import { describe, expect, it } from "vitest";

describe("packages/application smoke test", () => {
  it("carga el paquete y resuelve @ssot/domain", async () => {
    const mod = await import("../src/index.js");
    expect(mod).toBeDefined();
  });
});

// ActorContext/RT-01, ContactRepositoryPort y CrearContacto (UC-01):
// use-cases/crear-contacto.spec.ts. ContactQueryPort/ContactProviderPort/
// LlmPort/EmbeddingPort: declarados en src/ports/, sin adaptador ni
// invocacion (ADR-19a, ADR-20) hasta Fase 3/4/7 respectivamente.
