import { Module } from "@nestjs/common";
import { Pool } from "pg";
import { loadEnv } from "./config/env.js";
import { OutboxRelayService } from "./outbox/outbox-relay.service.js";

const RELAY_POOL = Symbol("RELAY_POOL");

@Module({
  providers: [
    {
      provide: RELAY_POOL,
      useFactory: () => new Pool({ connectionString: loadEnv().RELAY_DATABASE_URL }),
    },
    {
      provide: OutboxRelayService,
      useFactory: (pool: Pool) => new OutboxRelayService(pool),
      inject: [RELAY_POOL],
    },
  ],
})
export class WorkerModule {}
