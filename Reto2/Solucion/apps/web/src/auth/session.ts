import { getSupabaseClient } from "../lib/supabase.js";

/** Token de acceso vigente de la sesión de Supabase, o `null` si no hay sesión. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await getSupabaseClient().auth.getSession();
  return data.session?.access_token ?? null;
}
