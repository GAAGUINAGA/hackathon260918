import { createActorContext, type ActorContext } from "@ssot/application";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { createDb, type Database } from "../../src/db/connection.js";
import { withOwnerTransaction } from "../../src/db/transaction.js";

/**
 * Conexión de pruebas de integración (Fase 3). Requiere el Postgres de
 * `infra/docker-compose.yml` arriba y migrado. Se conecta como `app_rw`
 * (nunca como `ssot_admin`) para ejercer exactamente el camino de
 * privilegios que usará la aplicación real (ADR-04, RT-13).
 */
export function getIntegrationDatabaseUrl(): string {
  return (
    process.env["TEST_DATABASE_URL"] ??
    "postgresql://app_rw:app_rw_local_dev_change_me@localhost:5433/ssot_contacts"
  );
}

export function createTestPool(): Pool {
  return new Pool({ connectionString: getIntegrationDatabaseUrl() });
}

export function createTestDb(pool: Pool): Database {
  return createDb(pool);
}

export function newOwner(): ActorContext {
  return createActorContext(randomUUID());
}

export { withOwnerTransaction };
