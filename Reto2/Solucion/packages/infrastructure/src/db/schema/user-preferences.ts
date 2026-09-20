import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { aiModeEnum } from "./enums.js";
import { stateColumn, timestamps } from "./_shared.js";

/**
 * Espejo mínimo del perfil (UC-08, paso 4): nunca una copia de credenciales.
 * PK = `auth.users.id` (Supabase Auth); una fila por usuario, aprovisionada
 * en la primera petición autenticada.
 */
export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id").primaryKey(),
  region: text("region").notNull().default("EC"),
  language: text("language").notNull().default("es"),
  timezone: text("timezone").notNull().default("UTC"),
  // Reserva ADR-20: el sistema se comporta como si la IA estuviera apagada.
  // Ningún caso de uso de F1-F6 escribe un valor distinto de 'off'.
  aiMode: aiModeEnum("ai_mode").notNull().default("off"),
  state: stateColumn(),
  ...timestamps(),
});
