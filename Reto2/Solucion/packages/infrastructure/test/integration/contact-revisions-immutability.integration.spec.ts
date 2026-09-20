import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { contacts, contactRevisions } from "../../src/db/schema/index.js";
import { createTestDb, createTestPool, newOwner, withOwnerTransaction, type Database } from "./test-db.js";

/**
 * RT-10: `contact_revisions` no admite `UPDATE` ni `DELETE`. Se verifica
 * que el rechazo ocurre a nivel de privilegios de Postgres (`app_rw` no
 * tiene esos GRANT), no solo porque el código de aplicación nunca lo
 * intente — la prueba lo intenta deliberadamente.
 */
describe("contact_revisions es append-only a nivel de rol (Fase 3, integración)", () => {
  let pool: Pool;
  let db: Database;

  beforeAll(() => {
    pool = createTestPool();
    db = createTestDb(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("permite INSERT y SELECT pero rechaza UPDATE y DELETE con error de permisos", async () => {
    const owner = newOwner();

    const revisionId = await withOwnerTransaction(db, owner, async (tx) => {
      const [contact] = await tx
        .insert(contacts)
        .values({ ownerId: owner.ownerId, displayName: "Ana" })
        .returning({ id: contacts.id });
      const contactId = contact?.id;
      if (contactId === undefined) throw new Error("fixture: insert failed");

      const [revision] = await tx
        .insert(contactRevisions)
        .values({
          contactId,
          ownerId: owner.ownerId,
          actorKind: "user",
          operation: "create",
          fieldChanges: {},
        })
        .returning({ id: contactRevisions.id });
      return revision?.id;
    });
    expect(revisionId).toBeDefined();

    await expectPermissionDenied(
      withOwnerTransaction(db, owner, async (tx) => {
        await tx.update(contactRevisions).set({ operation: "update" });
      }),
    );

    await expectPermissionDenied(
      withOwnerTransaction(db, owner, async (tx) => {
        await tx.delete(contactRevisions);
      }),
    );
  });
});

/**
 * drizzle-orm envuelve el error real de `pg` en `DrizzleQueryError`; el
 * mensaje de permiso denegado vive en `.cause`, no en `.message` de nivel
 * superior (`"Failed query: update ..."`). SQLSTATE 42501 = insufficient_privilege.
 */
async function expectPermissionDenied(promise: Promise<unknown>): Promise<void> {
  await expect(promise).rejects.toSatisfy((error: unknown) => {
    const cause = error instanceof Error ? error.cause : undefined;
    const code = cause !== undefined && typeof cause === "object" && "code" in cause ? cause.code : undefined;
    return code === "42501";
  });
}
