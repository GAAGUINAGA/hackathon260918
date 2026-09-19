import { describe, expect, it } from "vitest";

describe("packages/infrastructure smoke test (Fase 0)", () => {
  it("carga el paquete y resuelve @ssot/domain y @ssot/application", async () => {
    const mod = await import("../src/index.js");
    expect(mod).toBeDefined();
  });
});

describe.todo("RLS FORCE + WITH CHECK en las 16 tablas Drizzle (Fase 3, ADR-04)");
describe.todo("SET LOCAL app.current_user_id por transaccion (Fase 3, RT-13)");
describe.todo("Cifrado AES-256-GCM de refresh_token, IV no reutilizado (Fase 3, RT-08)");
describe.todo("Outbox transaccional - mismo COMMIT que la mutacion (Fase 3, RT-04)");
describe.todo("Indices unicos parciales WHERE state (Fase 3, RT-16)");
