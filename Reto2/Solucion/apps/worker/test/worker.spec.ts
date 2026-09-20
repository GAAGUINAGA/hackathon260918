import { describe, expect, it } from "vitest";
import { RING } from "../src/main.js";

describe("apps/worker smoke test", () => {
  it("expone el marcador de anillo", () => {
    expect(RING).toBe("A3-worker");
  });
});

// Rele Outbox (LISTEN/NOTIFY + sondeo adaptativo, reclamo concurrente
// FOR UPDATE SKIP LOCKED): packages/infrastructure test/outbox/relay.spec.ts
// y test/integration/outbox-relay.integration.spec.ts. Ciclo de vida en
// este proceso: test/outbox-relay.service.spec.ts.
//
// Diferido: RT-05 (jobId determinista) y RT-19 (serializacion por cuenta
// de integracion) solo aplican a colas BullMQ de trabajos reales
// (sync/import/export, UC-05/06/07); esos casos de uso no existen aun,
// asi que no hay nada que probar sin inventar logica de negocio fuera de
// fase.
