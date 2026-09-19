import { describe, expect, it } from "vitest";

describe("packages/application smoke test (Fase 0)", () => {
  it("carga el paquete y resuelve @ssot/domain", async () => {
    const mod = await import("../src/index.js");
    expect(mod).toBeDefined();
  });
});

describe.todo("ActorContext y politica de autorizacion RT-01 (Fase 2)");
describe.todo("ContactRepositoryPort - doble en memoria (Fase 2)");
describe.todo("ContactQueryPort por agregado, owner_id no parametrizable (Fase 2, ADR-19a)");
describe.todo("Puertos diferidos LlmPort / EmbeddingPort declarados sin adaptador (Fase 2, ADR-20)");
