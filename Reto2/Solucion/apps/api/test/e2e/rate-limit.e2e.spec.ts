import "reflect-metadata";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { JWT_VERIFIER } from "../../src/auth/jwt-verifier.token.js";

const DATABASE_URL =
  process.env["TEST_DATABASE_URL"] ?? "postgresql://app_rw:app_rw_local_dev_change_me@localhost:5433/ssot_contacts";

process.env["DATABASE_URL"] = DATABASE_URL;
process.env["SUPABASE_JWKS_URL"] = "https://unused.invalid/jwks";
process.env["SUPABASE_ISSUER"] = "https://project.supabase.co/auth/v1";
process.env["SUPABASE_AUDIENCE"] = "authenticated";
// Límite deliberadamente bajo para hacer el test determinista y rápido.
process.env["RATE_LIMIT_TTL_MS"] = "60000";
process.env["RATE_LIMIT_LIMIT"] = "3";

/**
 * RT-09: limitación de tasa por IP. `ThrottlerGuard` es un `APP_GUARD`
 * global (app.module.ts), por lo que actúa ANTES que `JwtAuthGuard`
 * (guard de controlador) — se puede probar golpeando una ruta protegida
 * sin token: el 429 debe llegar antes que el 401.
 */
describe("Rate limiting (Fase 4, RT-09, e2e)", () => {
  let app: NestFastifyApplication;
  let fastify: FastifyInstance;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(JWT_VERIFIER)
      .useValue({ verify: async () => ({ sub: "unused", aal: undefined }) })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    fastify = app.getHttpAdapter().getInstance();
    await fastify.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("responde 429 tras exceder el límite configurado (RATE_LIMIT_LIMIT=3)", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const response = await fastify.inject({ method: "GET", url: "/v1/contacts" });
      statuses.push(response.statusCode);
    }

    expect(statuses).toContain(429);
    // Las primeras peticiones dentro del límite no deben ser 429 (llegan
    // a JwtAuthGuard y fallan con 401 al no llevar token, no con 429).
    expect(statuses[0]).toBe(401);
  });
});
