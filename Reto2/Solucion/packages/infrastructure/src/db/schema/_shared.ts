import { boolean, timestamp, uuid } from "drizzle-orm/pg-core";

/** UUID primario generado en base de datos (Postgres >=13, sin extensión). */
export function uuidPk() {
  return uuid("id").primaryKey().defaultRandom();
}

/**
 * `state` universal (ADR-21): `true` existe y es visible, `false` retirado.
 * Presente en 14 de las 16 tablas; exentas `contact_revisions` (RT-10) y
 * `outbox` (infraestructura transitoria, RT-04 §4.2).
 */
export function stateColumn() {
  return boolean("state").notNull().default(true);
}

export function withdrawnAtColumn() {
  return timestamp("withdrawn_at", { withTimezone: true });
}

export function timestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  };
}

/** `owner_id` obligatorio (RT-01): id del usuario en Supabase Auth (`auth.users.id`). */
export function ownerIdColumn() {
  return uuid("owner_id").notNull();
}
