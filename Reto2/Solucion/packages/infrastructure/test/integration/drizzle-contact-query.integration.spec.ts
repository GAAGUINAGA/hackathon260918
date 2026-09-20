import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleContactQuery } from "../../src/queries/drizzle-contact-query.js";
import { contacts } from "../../src/db/schema/index.js";
import { createTestDb, createTestPool, newOwner, withOwnerTransaction, type Database } from "./test-db.js";

/**
 * UC-11 (ADR-19a): el puerto de lectura resuelve el propietario de
 * `ActorContext` y RLS lo blinda aunque el adaptador "olvidara" filtrar
 * (aquí no se olvida, pero la prueba usa dos propietarios para
 * demostrarlo, tal como exige el criterio de aceptación de UC-11).
 */
describe("DrizzleContactQuery (Fase 3, integración)", () => {
  let pool: Pool;
  let db: Database;
  let query: DrizzleContactQuery;

  beforeAll(() => {
    pool = createTestPool();
    db = createTestDb(pool);
    query = new DrizzleContactQuery(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("list() solo devuelve contactos del propietario del actor", async () => {
    const ownerA = newOwner();
    const ownerB = newOwner();

    await withOwnerTransaction(db, ownerA, (tx) =>
      tx.insert(contacts).values({ ownerId: ownerA.ownerId, displayName: "Contacto A" }),
    );
    await withOwnerTransaction(db, ownerB, (tx) =>
      tx.insert(contacts).values({ ownerId: ownerB.ownerId, displayName: "Contacto B" }),
    );

    const pageA = await query.list(ownerA, { limit: 10 });
    expect(pageA.items).toHaveLength(1);
    expect(pageA.items[0]?.displayName).toBe("Contacto A");
  });

  it("busca por texto usando el tsvector generado (unaccent + simple)", async () => {
    const owner = newOwner();
    await withOwnerTransaction(db, owner, (tx) =>
      tx.insert(contacts).values({ ownerId: owner.ownerId, displayName: "José Pérez", company: "Acme" }),
    );

    const found = await query.list(owner, { limit: 10, searchTerm: "jose" });
    expect(found.items.some((item) => item.displayName === "José Pérez")).toBe(true);

    const notFound = await query.list(owner, { limit: 10, searchTerm: "inexistente-xyz" });
    expect(notFound.items).toHaveLength(0);
  });

  it("findSummaryById devuelve null para un contacto retirado (sin opt-in)", async () => {
    const owner = newOwner();
    const [row] = await withOwnerTransaction(
      db,
      owner,
      (tx) =>
        tx
          .insert(contacts)
          .values({ ownerId: owner.ownerId, displayName: "Retirado", state: false, withdrawnAt: new Date() })
          .returning({ id: contacts.id }),
      { includeRetired: true },
    );
    const contactId = row?.id;
    expect(contactId).toBeDefined();
    if (contactId === undefined) throw new Error("fixture: insert failed");

    const summary = await query.findSummaryById(owner, contactId);
    expect(summary).toBeNull();
  });
});
