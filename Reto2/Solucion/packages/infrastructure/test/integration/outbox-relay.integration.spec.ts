import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { outbox } from "../../src/db/schema/index.js";
import { OutboxRelay, type OutboxRelayEvent } from "../../src/outbox/relay.js";
import { createTestDb, newOwner, withOwnerTransaction, type Database } from "./test-db.js";

/**
 * RT-04 §4.2: el relé opera como `app_relay`, no `app_rw` — un lote abarca
 * contactos de MUCHOS propietarios a la vez, algo que la política de
 * `app_rw` bloquearía. Se verifica contra Postgres real: reclamo con
 * `FOR UPDATE SKIP LOCKED`, marcado de `processed_at` en la misma
 * transacción, y visibilidad cruzada de propietarios exclusiva de este rol.
 */
describe("OutboxRelay.processBatch (Fase 3, integración)", () => {
  let relayPool: Pool;
  let appDb: Database;

  beforeAll(() => {
    relayPool = new Pool({
      connectionString:
        process.env["TEST_RELAY_DATABASE_URL"] ??
        "postgresql://app_relay:app_relay_local_dev_change_me@localhost:5433/ssot_contacts",
    });
    appDb = createTestDb(
      new Pool({
        connectionString:
          process.env["TEST_DATABASE_URL"] ?? "postgresql://app_rw:app_rw_local_dev_change_me@localhost:5433/ssot_contacts",
      }),
    );
  });

  afterAll(async () => {
    await relayPool.end();
  });

  beforeEach(async () => {
    // Otros archivos de prueba insertan en outbox y no siempre limpian
    // (lo verifican por owner_id via app_rw, que no ve nada ajeno); como
    // app_relay ve TODA la tabla por diseño, hay que partir de cero aquí.
    await relayPool.query('DELETE FROM "outbox"');
  });

  it("reclama eventos de múltiples propietarios en un solo lote (fuera del alcance de app_rw)", async () => {
    const ownerA = newOwner();
    const ownerB = newOwner();
    await withOwnerTransaction(appDb, ownerA, (tx) =>
      tx.insert(outbox).values({ ownerId: ownerA.ownerId, eventType: "dedupe:scan", payload: { contactId: randomUUID() } }),
    );
    await withOwnerTransaction(appDb, ownerB, (tx) =>
      tx.insert(outbox).values({ ownerId: ownerB.ownerId, eventType: "dedupe:scan", payload: { contactId: randomUUID() } }),
    );

    const handled: OutboxRelayEvent[] = [];
    const relay = new OutboxRelay(relayPool, async (event) => {
      handled.push(event);
    });

    const processedCount = await relay.processBatch();

    expect(processedCount).toBe(2);
    expect(new Set(handled.map((e) => e.ownerId))).toEqual(new Set([ownerA.ownerId, ownerB.ownerId]));
  });

  it("marca processed_at y no vuelve a reclamar el mismo evento", async () => {
    const owner = newOwner();
    await withOwnerTransaction(appDb, owner, (tx) =>
      tx.insert(outbox).values({ ownerId: owner.ownerId, eventType: "dedupe:scan", payload: {} }),
    );

    const relay = new OutboxRelay(relayPool, async () => {});
    const first = await relay.processBatch();
    const second = await relay.processBatch();

    expect(first).toBe(1);
    expect(second).toBe(0);
  });

  it("si el handler falla, la transacción revierte y el evento queda disponible para reintentar (RT-06)", async () => {
    const owner = newOwner();
    await withOwnerTransaction(appDb, owner, (tx) =>
      tx.insert(outbox).values({ ownerId: owner.ownerId, eventType: "dedupe:scan", payload: {} }),
    );

    const failingRelay = new OutboxRelay(relayPool, async () => {
      throw new Error("fallo simulado del handler");
    });
    await expect(failingRelay.processBatch()).rejects.toThrow("fallo simulado del handler");

    const retryingRelay = new OutboxRelay(relayPool, async () => {});
    const processed = await retryingRelay.processBatch();
    expect(processed).toBe(1);
  });
});
