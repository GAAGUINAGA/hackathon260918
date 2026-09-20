import { describe, expect, it } from "vitest";
import { OutboxRelay } from "../../src/outbox/relay.js";

describe("OutboxRelay.nextPollIntervalMs (RT-04 §4.2, sondeo adaptativo)", () => {
  it("vuelve al intervalo mínimo cuando hubo trabajo en la última pasada", () => {
    const relay = new OutboxRelay({} as never, async () => {}, {
      minPollIntervalMs: 200,
      maxPollIntervalMs: 30_000,
    });
    expect(relay.nextPollIntervalMs(5)).toBe(200);
  });

  it("duplica el intervalo cuando no hubo trabajo, hasta el techo configurado", () => {
    const relay = new OutboxRelay({} as never, async () => {}, {
      minPollIntervalMs: 200,
      maxPollIntervalMs: 1000,
    });
    expect(relay.nextPollIntervalMs(0)).toBe(400);
  });

  it("nunca supera el techo configurado, incluso partiendo cerca de él", () => {
    const relay = new OutboxRelay({} as never, async () => {}, {
      minPollIntervalMs: 400,
      maxPollIntervalMs: 500,
    });
    expect(relay.nextPollIntervalMs(0)).toBe(500);
  });
});
