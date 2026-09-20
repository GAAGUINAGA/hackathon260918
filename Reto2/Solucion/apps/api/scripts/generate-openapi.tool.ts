import "reflect-metadata";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { it } from "vitest";
import { AppModule } from "../src/app.module.js";

/**
 * ADR-08: genera `packages/contracts/openapi.json` desde los decoradores
 * de NestJS/Swagger, sin levantar el puerto HTTP ni el adaptador
 * WebSocket de Redis. Se apoya en `@nestjs/testing` (el mismo camino de
 * arranque que ya usan los e2e en `test/e2e/`) en lugar de
 * `NestFactory.create` directo: eso evita una segunda copia de
 * `@nestjs/core` cargada por la resolución de módulos fuera de Vitest,
 * que rompía la inyección de dependencias del `Reflector` en
 * `ThrottlerGuard`. No ejecuta ninguna consulta SQL: el pool de `pg` es
 * perezoso y esta ruta nunca llama a `query`.
 */
process.env["DATABASE_URL"] ??= "postgresql://placeholder:placeholder@localhost:5432/placeholder";
process.env["SUPABASE_JWKS_URL"] ??= "https://placeholder.supabase.co/auth/v1/.well-known/jwks.json";
process.env["SUPABASE_ISSUER"] ??= "https://placeholder.supabase.co/auth/v1";

it(
  "genera openapi.json (ADR-08)",
  async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();

    const config = new DocumentBuilder()
      .setTitle("SSOT Contacts API")
      .setDescription("Plataforma de Centralización de Contactos — Reto 2")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);

    const here = dirname(fileURLToPath(import.meta.url));
    const outPath = resolve(here, "../../../packages/contracts/openapi.json");
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`, "utf-8");

    await app.close();
  },
  30_000,
);
