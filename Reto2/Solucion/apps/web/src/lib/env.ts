/**
 * Configuración de entorno del cliente web, validada al arranque. Vite
 * solo expone variables prefijadas `VITE_` (`import.meta.env`).
 */
export interface WebEnv {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly apiBaseUrl: string;
}

export class MissingEnvError extends Error {
  constructor(public readonly missing: readonly string[]) {
    super(`Configuración incompleta: faltan ${missing.join(", ")}. Ver apps/web/.env.example.`);
    this.name = "MissingEnvError";
  }
}

export function loadWebEnv(): WebEnv {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("VITE_SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("VITE_SUPABASE_ANON_KEY");
  if (!apiBaseUrl) missing.push("VITE_API_BASE_URL");

  if (missing.length > 0) {
    throw new MissingEnvError(missing);
  }

  return { supabaseUrl, supabaseAnonKey, apiBaseUrl };
}
