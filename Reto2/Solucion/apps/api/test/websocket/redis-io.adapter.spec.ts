import { describe, expect, it, vi } from "vitest";

const duplicate = vi.fn();
const quit = vi.fn(async () => "OK");

vi.mock("ioredis", () => {
  class FakeRedis {
    quit = quit;
    duplicate = duplicate;
  }
  return { Redis: FakeRedis };
});

const createAdapterFn = vi.fn(() => "fake-adapter");
vi.mock("@socket.io/redis-adapter", () => ({ createAdapter: createAdapterFn }));

vi.mock("@nestjs/platform-socket.io", () => ({
  IoAdapter: class {
    constructor(_app: unknown) {}
    createIOServer(_port: number, _options?: unknown): unknown {
      return { adapter: vi.fn() };
    }
  },
}));

describe("RedisIoAdapter (ADR-06)", () => {
  it("aplica el adaptador de Redis al servidor Socket.IO creado", async () => {
    duplicate.mockReturnValue({ quit });
    const { RedisIoAdapter } = await import("../../src/websocket/redis-io.adapter.js");

    const adapter = new RedisIoAdapter({} as never, "redis://localhost:6379");
    const server = adapter.createIOServer(3000) as { adapter: ReturnType<typeof vi.fn> };

    expect(createAdapterFn).toHaveBeenCalledOnce();
    expect(server.adapter).toHaveBeenCalledWith("fake-adapter");
  });

  it("closeRedisConnections cierra ambos clientes (pub y sub)", async () => {
    duplicate.mockReturnValue({ quit });
    const { RedisIoAdapter } = await import("../../src/websocket/redis-io.adapter.js");
    const adapter = new RedisIoAdapter({} as never, "redis://localhost:6379");

    await adapter.closeRedisConnections();

    expect(quit).toHaveBeenCalled();
  });
});
