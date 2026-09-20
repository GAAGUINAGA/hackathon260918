import { CrearContacto } from "@ssot/application";
import { eq } from "drizzle-orm";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { contacts, outbox } from "../../src/db/schema/index.js";
import { withTransactionalContactWrites } from "../../src/transactional-contact-writes.js";
import { createTestDb, createTestPool, newOwner, withOwnerTransaction, type Database } from "./test-db.js";

/**
 * RT-04 (regla crítica): "ningún efecto externo se dispara fuera de la
 * transacción que modifica el estado". Prueba que la composición de
 * `ContactRepositoryPort` + `OutboxPort` vía `withTransactionalContactWrites`
 * cumple esto de verdad contra Postgres real: si algo falla después de
 * persistir el contacto pero antes de cerrar la transacción, el contacto
 * NO queda huérfano en la base — todo o nada.
 */
describe("withTransactionalContactWrites (Fase 3, RT-04, integración)", () => {
  let pool: Pool;
  let db: Database;

  beforeAll(() => {
    pool = createTestPool();
    db = createTestDb(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("CrearContacto persiste el contacto y encola dedupe:scan en la misma transacción", async () => {
    const actor = newOwner();
    let generatedId = "";

    await withTransactionalContactWrites(db, actor, async (ports) => {
      const useCase = new CrearContacto(ports.contactRepository, ports.outbox, () => {
        generatedId = crypto.randomUUID();
        return generatedId;
      });
      const result = await useCase.execute(actor, { displayName: "Ana" });
      if (result.isErr()) throw new Error("fixture: use case falló");
    });

    const [contactRow] = await withOwnerTransaction(db, actor, (tx) =>
      tx.select().from(contacts).where(eq(contacts.id, generatedId)),
    );
    expect(contactRow).toBeDefined();

    const outboxRows = await withOwnerTransaction(db, actor, (tx) =>
      tx.select().from(outbox).where(eq(outbox.ownerId, actor.ownerId)),
    );
    expect(outboxRows).toHaveLength(1);
    expect(outboxRows[0]?.eventType).toBe("dedupe:scan");
  });

  it("si algo falla tras persistir el contacto, la transacción revierte TODO (ni contacto ni evento quedan)", async () => {
    const actor = newOwner();
    let generatedId = "";

    await expect(
      withTransactionalContactWrites(db, actor, async (ports) => {
        const useCase = new CrearContacto(ports.contactRepository, ports.outbox, () => {
          generatedId = crypto.randomUUID();
          return generatedId;
        });
        const result = await useCase.execute(actor, { displayName: "Contacto que no debe sobrevivir" });
        if (result.isErr()) throw new Error("fixture: use case falló");

        // Simula un fallo posterior en la misma unidad de trabajo (p. ej.
        // el adaptador de integración lanzando tras el guardado).
        throw new Error("fallo simulado tras persistir");
      }),
    ).rejects.toThrow("fallo simulado tras persistir");

    const orphanContact = await withTransactionalContactWrites(db, actor, async (ports) => {
      return ports.contactRepository.findById(actor, generatedId);
    });
    expect(orphanContact).toBeNull();

    const outboxRows = await withOwnerTransaction(db, actor, (tx) =>
      tx.select().from(outbox).where(eq(outbox.ownerId, actor.ownerId)),
    );
    expect(outboxRows).toHaveLength(0);
  });
});
