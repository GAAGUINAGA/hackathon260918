import type { ActorContext, ContactRepositoryPort, OutboxPort } from "@ssot/application";
import type { Database } from "./db/connection.js";
import { withOwnerTransaction } from "./db/transaction.js";
import { DrizzleContactRepository } from "./repositories/drizzle-contact-repository.js";
import { DrizzleOutbox } from "./outbox/drizzle-outbox.js";

/**
 * RT-04 (regla crítica): un caso de uso como `CrearContacto` (UC-01) llama
 * a `ContactRepositoryPort.save()` y `OutboxPort.enqueue()` como dos
 * puertos independientes — así debe ser, la aplicación no sabe de
 * transacciones. La atomicidad entre ambos es responsabilidad de quien
 * COMPONE los adaptadores: esta función construye ambos puertos ligados a
 * la MISMA transacción (los `save()`/`enqueue()` internos anidan un
 * SAVEPOINT en vez de abrir una transacción nueva — ver `DrizzleOutbox`),
 * de modo que un fallo en cualquiera de los dos revierte todo el conjunto.
 *
 * La raíz de composición de Fase 4 (controlador NestJS) debe construir los
 * puertos de un caso de uso a través de esta función, nunca instanciando
 * `DrizzleContactRepository`/`DrizzleOutbox` por separado contra el `db`
 * de nivel superior — eso rompería RT-04 silenciosamente.
 */
export async function withTransactionalContactWrites<T>(
  db: Database,
  actor: ActorContext,
  fn: (ports: { contactRepository: ContactRepositoryPort; outbox: OutboxPort }) => Promise<T>,
): Promise<T> {
  return withOwnerTransaction(
    db,
    actor,
    async (tx) => {
      const contactRepository = new DrizzleContactRepository(tx);
      const outboxPort = new DrizzleOutbox(tx);
      return fn({ contactRepository, outbox: outboxPort });
    },
    { includeRetired: true },
  );
}
