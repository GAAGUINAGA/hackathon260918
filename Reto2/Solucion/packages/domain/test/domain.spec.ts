import { describe, expect, it } from "vitest";

describe("packages/domain smoke test (Fase 0)", () => {
  it("carga el paquete sin dependencias externas", async () => {
    const mod = await import("../src/index.js");
    expect(mod).toBeDefined();
  });
});

describe.todo("EmailAddress value object (Fase 1, ADR-10)");
describe.todo("PhoneNumber value object - normalizacion E.164 (Fase 1, ADR-10)");
describe.todo("Normalizacion NFKC / unaccent (Fase 1)");
describe.todo("Motor de puntuacion de deduplicacion B1-B4 (Fase 1, ADR-18a, UC-03)");
