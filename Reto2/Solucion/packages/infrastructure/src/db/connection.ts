import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

export type Database = NodePgDatabase<typeof schema>;

/**
 * La aplicacion se conecta como `app_rw` (ADR-04, RT-13), nunca como
 * `service_role` ni como propietario de las tablas. `connectionString`
 * debe apuntar siempre a esas credenciales fuera de este modulo.
 */
export function createPool(connectionString: string): Pool {
  return new Pool({ connectionString });
}

export function createDb(pool: Pool): Database {
  return drizzle(pool, { schema });
}
