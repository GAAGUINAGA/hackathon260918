import type { ActorContext, OutboxEvent, OutboxPort } from "@ssot/application";
import type { Database } from "../db/connection.js";
import { outbox } from "../db/schema/index.js";
import { withOwnerTransaction } from "../db/transaction.js";

/**
 * Adaptador de salida (Anillo 2) de `OutboxPort` (RT-04). El `INSERT` en
 * `outbox` dispara `notify_outbox()` (migración 0001), que emite `NOTIFY`
 * para el relé — la carga útil no viaja en la notificación (§4.2).
 *
 * Atomicidad con otros puertos: si `this.db` ya es una transacción en
 * curso (p. ej. compuesta junto a `DrizzleContactRepository` via
 * `withTransactionalContactWrites`), `withOwnerTransaction` anida un
 * SAVEPOINT en vez de abrir una transacción nueva — sigue siendo la MISMA
 * transacción de nivel superior a efectos de RT-04.
 */
export class DrizzleOutbox implements OutboxPort {
  constructor(private readonly db: Database) {}

  async enqueue(actor: ActorContext, event: OutboxEvent): Promise<void> {
    await withOwnerTransaction(this.db, actor, async (tx) => {
      await tx.insert(outbox).values({
        ownerId: actor.ownerId,
        eventType: event.type,
        payload: event.payload,
      });
    });
  }
}
