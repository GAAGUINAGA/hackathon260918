import { sql } from "drizzle-orm";
import type { Database } from "../db/connection.js";
import { userPreferences } from "../db/schema/index.js";

/**
 * UC-08, paso 4: en la primera petición autenticada de un usuario
 * desconocido se aprovisiona su fila de perfil con preferencias por
 * defecto. Idempotente ante concurrencia (flujo alterno 4a: dos
 * peticiones simultáneas del mismo usuario nuevo no crean dos perfiles) —
 * `ON CONFLICT DO NOTHING` sobre la PK resuelve la carrera a nivel de BD,
 * sin necesitar un `SELECT` previo.
 *
 * Fija `app.current_user_id` para la propia inserción: la política RLS de
 * `user_preferences` exige `WITH CHECK (user_id = app.current_user_id)`,
 * y la fila puede no existir todavía (por eso no pasa por
 * `withOwnerTransaction`, pensado para operaciones sobre filas que ya
 * tienen dueño acotado).
 */
export async function provisionUserPreferences(db: Database, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
    await tx.insert(userPreferences).values({ userId }).onConflictDoNothing({ target: userPreferences.userId });
  });
}
