import { z } from "zod";

/** RT-04 §4.2: el relé se conecta como `app_relay`, nunca como `app_rw` (ese rol no ve más que un propietario a la vez). */
const envSchema = z.object({
  RELAY_DATABASE_URL: z.string().min(1, "RELAY_DATABASE_URL es obligatorio (rol app_relay, RT-04 §4.2)"),
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
