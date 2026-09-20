import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { OutboxRelayService } from "../src/outbox/outbox-relay.service.js";

const start = vi.fn(async () => {});
const stop = vi.fn();

vi.mock("@ssot/infrastructure", () => {
  class FakeOutboxRelay {
    start = start;
    stop = stop;
  }
  return { OutboxRelay: FakeOutboxRelay };
});

describe("OutboxRelayService (Fase 4, ciclo de vida del relé)", () => {
  it("arranca el relé en onModuleInit y lo detiene en onModuleDestroy", async () => {
    const service = new OutboxRelayService({} as Pool);

    await service.onModuleInit();
    expect(start).toHaveBeenCalledOnce();

    service.onModuleDestroy();
    expect(stop).toHaveBeenCalledOnce();
  });
});
