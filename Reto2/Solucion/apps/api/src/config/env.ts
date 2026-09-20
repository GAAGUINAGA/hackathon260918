import { z } from "zod";

/**
 * Configuración tipada y validada al arranque (falla rápido si falta algo).
 * `SUPABASE_JWKS_URL` es la única fuente de verdad para verificar JWT
 * (ADR-05, RT-12): el backend nunca emite ni firma credenciales propias.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatorio (app_rw, ADR-04)"),
  SUPABASE_JWKS_URL: z.string().url("SUPABASE_JWKS_URL debe ser una URL válida (ADR-05)"),
  SUPABASE_ISSUER: z.string().min(1, "SUPABASE_ISSUER es obligatorio para validar el claim iss"),
  SUPABASE_AUDIENCE: z.string().min(1).default("authenticated"),
  RATE_LIMIT_TTL_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_LIMIT: z.coerce.number().int().positive().default(100),
  // ADR-06: adaptador Redis para Socket.IO — necesario en cuanto haya más
  // de una instancia del API, para que la emisión agregada por sala de
  // propietario llegue a un cliente conectado a otra instancia.
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  // AUDITORIA#4 O-03: sin definir, Fastify resuelve la IP directa (correcto
  // en local/CI). Detrás de un proxy/LB (F6) debe fijarse a la cantidad de
  // saltos de confianza o a la lista de IPs del balanceador — nunca a
  // `true` a ciegas, que confiaría en cualquier `X-Forwarded-For` entrante.
  TRUST_PROXY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Configuración de entorno inválida:\n${issues}`);
  }
  return result.data;
}
