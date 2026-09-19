import { describe, expect, it } from "vitest";
import { RING } from "../src/main.js";

describe("apps/api smoke test (Fase 0)", () => {
  it("expone el marcador de anillo", () => {
    expect(RING).toBe("A3-api");
  });
});

describe.todo("Guard JWT contra JWKS de Supabase (Fase 4, ADR-05, RT-12)");
describe.todo("ClassSerializerInterceptor con excludeAll (Fase 4)");
describe.todo("Gateway WebSocket autenticado en handshake (Fase 4, ADR-06)");
describe.todo("Rate limiting en rutas sensibles (Fase 4, RT-09)");
