import { describe, expect, it } from "vitest";
import { RING } from "../src/main.js";

describe("apps/worker smoke test (Fase 0)", () => {
  it("expone el marcador de anillo", () => {
    expect(RING).toBe("A3-worker");
  });
});

describe.todo("Rele Outbox - LISTEN/NOTIFY + sondeo adaptativo (Fase 4, RT-04)");
describe.todo("Reclamo concurrente SELECT ... FOR UPDATE SKIP LOCKED (Fase 4)");
describe.todo("Idempotencia de jobs por jobId determinista (Fase 4, RT-05)");
describe.todo("Serializacion por cuenta de integracion (Fase 4, RT-19)");
