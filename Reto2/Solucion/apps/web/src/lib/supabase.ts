import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadWebEnv } from "./env.js";

let client: SupabaseClient | null = null;

/**
 * Cliente de Supabase Auth (ADR-05: identidad delegada). Se usa
 * exclusivamente para el ciclo de sesión (login, logout, refresh de
 * token); nunca para leer tablas — todo dato de negocio pasa por
 * `apps/api` (planeacion v2.1.2, "Identidad").
 */
export function getSupabaseClient(): SupabaseClient {
  if (client === null) {
    const env = loadWebEnv();
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
