import { Global, Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { createDb, createPool, type Database } from "@ssot/infrastructure";
import type { Pool } from "pg";
import { ENV } from "../config/env.provider.js";
import type { Env } from "../config/env.js";

export const DATABASE_POOL = Symbol("DATABASE_POOL");
export const DATABASE = Symbol("DATABASE");

/**
 * La aplicación se conecta como `app_rw` (ADR-04, RT-13): `DATABASE_URL`
 * debe apuntar a esas credenciales, nunca a `ssot_admin` ni `service_role`.
 */
@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: (env: Env) => createPool(env.DATABASE_URL),
      inject: [ENV],
    },
    {
      provide: DATABASE,
      useFactory: (pool: Pool): Database => createDb(pool),
      inject: [DATABASE_POOL],
    },
  ],
  exports: [DATABASE_POOL, DATABASE],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
