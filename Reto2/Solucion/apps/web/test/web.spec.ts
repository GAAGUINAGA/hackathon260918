import { describe, expect, it } from "vitest";
import { RING } from "../src/main.js";

describe("apps/web smoke test (Fase 0)", () => {
  it("expone el marcador de anillo", () => {
    expect(RING).toBe("A4-web");
  });
});

describe.todo("Navegacion completa por teclado (Fase 5, ADR-12)");
describe.todo("aria-live=polite para progreso de sincronizacion (Fase 5, ADR-06)");
describe.todo("Cero usos de dangerouslySetInnerHTML (Fase 5)");
describe.todo("axe-core sin violaciones criticas (Fase 5, ADR-12)");
