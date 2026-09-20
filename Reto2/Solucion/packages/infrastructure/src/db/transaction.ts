import type { ActorContext } from "@ssot/application";
import { sql } from "drizzle-orm";
import type { Database } from "./connection.js";

export interface WithOwnerTransactionOptions {
  /**
   * RT-15: la papelera y la restauracion (UC-21) son la unica superficie de
   * PRODUCTO que expone filas retiradas al usuario. Pero a nivel de
   * Postgres, `includeRetired` tambien debe activarse en cualquier
   * transaccion de ESCRITURA que haga `UPDATE ... WHERE ...` sobre una
   * tabla cuya politica RLS filtra por `state` en USING: si esa
   * transaccion transiciona `state` (p. ej. UC-13 retira un contacto),
   * Postgres reevalua USING -no solo WITH CHECK- contra la fila NUEVA, y
   * el UPDATE falla con "new row violates row-level security policy"
   * aunque WITH CHECK solo exija el owner_id. Verificado empiricamente
   * contra Postgres 16 (ver test/integration/rls.integration.spec.ts).
   * Por eso los repositorios de escritura (Anillo 2) activan este opt-in
   * en toda mutacion, no solo en UC-21: la fila ya es conocida por id y
   * fue validada como propia antes de escribir, así que no reintroduce la
   * fuga que RT-15 previene (esa fuga es de LECTURA no acotada; el puerto
   * de lectura, `ContactQueryPort`, nunca activa este opt-in salvo dentro
   * de la propia transaccion de UC-21).
   */
  readonly includeRetired?: boolean;
}

/**
 * RT-13: toda transaccion de escritura/lectura acotada por propietario pasa
 * por aqui. `set_config(..., true)` es el equivalente parametrizado y
 * seguro de `SET LOCAL app.current_user_id = '<owner_id>'` — `SET LOCAL`
 * no admite parametros de consulta, así que interpolar el valor a mano
 * abriría la puerta a inyección; `set_config` es una llamada SQL normal.
 */
export async function withOwnerTransaction<T>(
  db: Database,
  actor: ActorContext,
  fn: (tx: Database) => Promise<T>,
  options: WithOwnerTransactionOptions = {},
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${actor.ownerId}, true)`);
    if (options.includeRetired === true) {
      await tx.execute(sql`SELECT set_config('app.include_retired', 'true', true)`);
    }
    return fn(tx as Database);
  });
}
