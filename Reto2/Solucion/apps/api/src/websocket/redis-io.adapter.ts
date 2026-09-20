import { IoAdapter } from "@nestjs/platform-socket.io";
import type { INestApplicationContext } from "@nestjs/common";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import type { Server, ServerOptions } from "socket.io";

/**
 * ADR-06: "Socket.IO con adaptador Redis". Necesario en cuanto el API
 * corra en más de una instancia: sin él, `emitJobProgress` solo alcanza a
 * los sockets conectados a ESA instancia — un cliente conectado a otra
 * réplica nunca vería el progreso de un job que otra instancia despachó.
 * Con una sola instancia (dev/CI) el adaptador en memoria de Socket.IO ya
 * basta, pero declarar el ADR y no cablearlo dejaría una brecha silenciosa
 * el día que se escale horizontalmente.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly pubClient: Redis;
  private readonly subClient: Redis;

  constructor(app: INestApplicationContext, redisUrl: string) {
    super(app);
    this.pubClient = new Redis(redisUrl);
    this.subClient = this.pubClient.duplicate();
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    server.adapter(createAdapter(this.pubClient, this.subClient));
    return server;
  }

  async closeRedisConnections(): Promise<void> {
    await Promise.all([this.pubClient.quit(), this.subClient.quit()]);
  }
}
