import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { loadEnv } from "./config/env.js";
import { RedisIoAdapter } from "./websocket/redis-io.adapter.js";

/**
 * Anillo 3 - API HTTP/WebSocket (NestJS + Fastify). No inicia hasta que
 * los anillos 0-2 estén cerrados, probados y auditados (ya lo están:
 * Fases 0-3). ADR-08: el contrato OpenAPI se genera desde los
 * decoradores (`scripts/generate-openapi.tool.ts`) hacia
 * `packages/contracts/openapi.json`, que orval (web) y openapi-generator
 * (mobile) consumen en Fase 5 — sin que `apps/api` importe ese paquete.
 */
export const RING = "A3-api" as const;

/**
 * AUDITORIA#4 O-03: `TRUST_PROXY` sin definir preserva el comportamiento
 * actual (IP directa). `"true"`/`"false"` son atajos legibles; una lista
 * separada por comas de IPs/CIDR del balanceador se pasa como array
 * (`trustProxy` de Fastify/`proxy-addr`); un solo valor se pasa tal cual.
 */
export function parseTrustProxy(value: string | undefined): boolean | string | string[] | undefined {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  const list = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return list.length > 1 ? list : value;
}

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const trustProxy = parseTrustProxy(env.TRUST_PROXY);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(trustProxy === undefined ? {} : { trustProxy }),
    { logger: ["error", "warn", "log"] },
  );

  app.useWebSocketAdapter(new RedisIoAdapter(app, env.REDIS_URL));

  const config = new DocumentBuilder()
    .setTitle("SSOT Contacts API")
    .setDescription("Plataforma de Centralización de Contactos — Reto 2")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  await app.listen(env.PORT, "0.0.0.0");
}

// Solo arranca si se ejecuta directamente (no al importar main.ts en tests).
if (process.argv[1]?.endsWith("main.js") === true || process.argv[1]?.endsWith("main.ts") === true) {
  void bootstrap();
}
