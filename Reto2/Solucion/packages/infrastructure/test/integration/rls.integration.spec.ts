import { sql } from "drizzle-orm";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { contacts } from "../../src/db/schema/index.js";
import { createTestDb, createTestPool, newOwner, withOwnerTransaction, type Database } from "./test-db.js";

/**
 * Prueba de integración contra Postgres real (ADR-04, RT-01, RT-13, RT-15).
 * Ejercita exactamente lo que UC-11 exige como criterio de aceptación:
 * "aunque el adaptador omitiera ambos filtros, el RLS devuelve cero filas
 * ajenas y cero filas retiradas". Aquí se omiten deliberadamente: se
 * consulta `contacts` sin `WHERE owner_id = ...` y se deja que la política
 * RLS, no el código de aplicación, sea quien filtre.
 */
describe("RLS FORCE + WITH CHECK (Fase 3, integración con Postgres real)", () => {
  let pool: Pool;
  let db: Database;

  beforeAll(() => {
    pool = createTestPool();
    db = createTestDb(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("aísla contactos entre propietarios aunque la consulta no filtre por owner_id", async () => {
    const ownerA = newOwner();
    const ownerB = newOwner();

    const contactId = await withOwnerTransaction(db, ownerA, async (tx) => {
      const [row] = await tx
        .insert(contacts)
        .values({ ownerId: ownerA.ownerId, displayName: "Contacto de A" })
        .returning({ id: contacts.id });
      return row?.id;
    });
    expect(contactId).toBeDefined();

    // Consulta deliberadamente sin WHERE owner_id: si RLS fallara, ownerB
    // vería el contacto de ownerA.
    const seenByOwnerB = await withOwnerTransaction(db, ownerB, async (tx) => {
      return tx.select().from(contacts);
    });
    expect(seenByOwnerB.find((row) => row.id === contactId)).toBeUndefined();

    const seenByOwnerA = await withOwnerTransaction(db, ownerA, async (tx) => {
      return tx.select().from(contacts);
    });
    expect(seenByOwnerA.find((row) => row.id === contactId)).toBeDefined();
  });

  it("sin app.current_user_id fijado, ninguna fila es visible (fail-closed)", async () => {
    // Conexión nueva, sin pasar por withOwnerTransaction: app.current_user_id
    // nunca se fija en esta transacción.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query('SELECT * FROM "contacts"');
      expect(result.rows).toHaveLength(0);
    } finally {
      // Sea cual sea el resultado, cerrar la transacción antes de soltar la
      // conexión: si algo lanzara aquí, dejarla "aborted" y liberarla sin
      // ROLLBACK envenenaría la siguiente prueba que reutilice esa conexión
      // del pool (node-postgres reutiliza conexiones liberadas).
      await client.query("ROLLBACK").catch(() => {});
      client.release();
    }
  });

  it("filtra registros retirados por defecto y los expone solo con el opt-in de la transacción (RT-15)", async () => {
    const owner = newOwner();

    const contactId = await withOwnerTransaction(
      db,
      owner,
      async (tx) => {
        const [row] = await tx
          .insert(contacts)
          .values({ ownerId: owner.ownerId, displayName: "Contacto retirado" })
          .returning({ id: contacts.id });
        const id = row?.id;
        if (id === undefined) throw new Error("fixture: insert failed");
        // Postgres re-evalúa USING (no solo WITH CHECK) contra la fila nueva
        // cuando el UPDATE lleva WHERE y USING referencia la columna que
        // cambia: sin el opt-in, este UPDATE con WHERE fallaría con "new row
        // violates row-level security policy" aunque WITH CHECK solo exija
        // el owner_id. El repositorio real activa este opt-in en toda
        // escritura (ver withOwnerTransaction); RT-15 solo restringe la
        // LECTURA por defecto, no la escritura de una fila ya conocida.
        await tx
          .update(contacts)
          .set({ state: false, withdrawnAt: new Date() })
          .where(sql`${contacts.id} = ${id}`);
        return id;
      },
      { includeRetired: true },
    );

    const withoutOptIn = await withOwnerTransaction(db, owner, async (tx) => {
      return tx.select().from(contacts);
    });
    expect(withoutOptIn.find((row) => row.id === contactId)).toBeUndefined();

    const withOptIn = await withOwnerTransaction(
      db,
      owner,
      async (tx) => {
        return tx.select().from(contacts);
      },
      { includeRetired: true },
    );
    expect(withOptIn.find((row) => row.id === contactId)).toBeDefined();
  });

  it("el opt-in de state no se filtra a otras transacciones (SET LOCAL, no SET)", async () => {
    const owner = newOwner();

    const contactId = await withOwnerTransaction(
      db,
      owner,
      async (tx) => {
        const [row] = await tx
          .insert(contacts)
          .values({ ownerId: owner.ownerId, displayName: "Otro retirado" })
          .returning({ id: contacts.id });
        const id = row?.id;
        if (id === undefined) throw new Error("fixture: insert failed");
        await tx.update(contacts).set({ state: false }).where(sql`${contacts.id} = ${id}`);
        return id;
      },
      { includeRetired: true },
    );

    // Nueva transacción, mismo owner, SIN opt-in: no debe heredar nada de la anterior.
    const afterwards = await withOwnerTransaction(db, owner, async (tx) => {
      return tx.select().from(contacts);
    });
    expect(afterwards.find((row) => row.id === contactId)).toBeUndefined();
  });
});
