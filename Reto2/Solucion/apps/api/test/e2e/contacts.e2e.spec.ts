import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import type { FastifyInstance } from "fastify";
import { exportJWK, generateKeyPair, importJWK, SignJWT, type JWTVerifyGetKey, type KeyLike } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { JWT_VERIFIER } from "../../src/auth/jwt-verifier.token.js";
import { JwtVerifier } from "../../src/auth/jwt-verifier.js";

const ISSUER = "https://project.supabase.co/auth/v1";
const AUDIENCE = "authenticated";
const KID = "e2e-test-key";

const DATABASE_URL =
  process.env["TEST_DATABASE_URL"] ?? "postgresql://app_rw:app_rw_local_dev_change_me@localhost:5433/ssot_contacts";

process.env["DATABASE_URL"] = DATABASE_URL;
process.env["SUPABASE_JWKS_URL"] = "https://unused.invalid/jwks";
process.env["SUPABASE_ISSUER"] = ISSUER;
process.env["SUPABASE_AUDIENCE"] = AUDIENCE;
process.env["RATE_LIMIT_TTL_MS"] = "60000";
process.env["RATE_LIMIT_LIMIT"] = "1000";

async function buildLocalVerifier(): Promise<{ verifier: JwtVerifier; sign: (sub: string, aal?: string) => Promise<string> }> {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: KID, alg: "RS256", use: "sig" };

  const getKey: JWTVerifyGetKey = async (header) => {
    if (header.kid !== KID) throw new Error("kid desconocido");
    return importJWK(jwk, "RS256") as Promise<KeyLike>;
  };

  const verifier = new JwtVerifier(getKey, ISSUER, AUDIENCE);
  const sign = async (sub: string, aal = "aal1"): Promise<string> =>
    new SignJWT({ sub, aal })
      .setProtectedHeader({ alg: "RS256", kid: KID })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime("5m")
      .sign(privateKey);

  return { verifier, sign };
}

describe("ContactsController (Fase 4, e2e contra Postgres real)", () => {
  let app: NestFastifyApplication;
  let fastify: FastifyInstance;
  let sign: (sub: string, aal?: string) => Promise<string>;

  beforeAll(async () => {
    const local = await buildLocalVerifier();
    sign = local.sign;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(JWT_VERIFIER)
      .useValue(local.verifier)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    fastify = app.getHttpAdapter().getInstance();
    await fastify.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rechaza sin token (401)", async () => {
    const response = await fastify.inject({ method: "GET", url: "/v1/contacts" });
    expect(response.statusCode).toBe(401);
  });

  it("crea un contacto (201-equivalente) y lo puede leer de vuelta, aislado por owner_id", async () => {
    const ownerA = randomUUID();
    const ownerB = randomUUID();
    const tokenA = await sign(ownerA);
    const tokenB = await sign(ownerB);

    const createResponse = await fastify.inject({
      method: "POST",
      url: "/v1/contacts",
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { displayName: "Ana Pérez", emails: [{ raw: "ana@empresa.com", isPrincipal: true }] },
    });
    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json<{ contactId: string; version: number }>();
    expect(created.version).toBe(1);

    const getAsOwner = await fastify.inject({
      method: "GET",
      url: `/v1/contacts/${created.contactId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(getAsOwner.statusCode).toBe(200);
    const body = getAsOwner.json<{ id: string; displayName: string; primaryEmail: string }>();
    expect(body.displayName).toBe("Ana Pérez");
    expect(body.primaryEmail).toBe("ana@empresa.com");

    // UC-12, flujo 2a: ajeno -> 404, nunca 403.
    const getAsOtherOwner = await fastify.inject({
      method: "GET",
      url: `/v1/contacts/${created.contactId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(getAsOtherOwner.statusCode).toBe(404);
  });

  it("responde 400 con el motivo cuando el dominio rechaza el cuerpo (UC-01, flujo 3a)", async () => {
    const token = await sign(randomUUID());
    const response = await fastify.inject({
      method: "POST",
      url: "/v1/contacts",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(response.statusCode).toBe(400);
    const body = response.json<{ code: string }>();
    expect(body.code).toBe("contact_empty");
  });

  it("responde 400 (zod) cuando el cuerpo no cumple el esquema de la frontera (RT-02)", async () => {
    const token = await sign(randomUUID());
    const response = await fastify.inject({
      method: "POST",
      url: "/v1/contacts",
      headers: { authorization: `Bearer ${token}` },
      payload: { unknownField: "no debería existir" },
    });
    expect(response.statusCode).toBe(400);
    const body = response.json<{ code: string }>();
    expect(body.code).toBe("invalid_input");
  });

  it("responde 404 para un id bien formado que no existe", async () => {
    const token = await sign(randomUUID());
    const response = await fastify.inject({
      method: "GET",
      url: `/v1/contacts/${randomUUID()}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(404);
  });

  it("la respuesta nunca incluye campos fuera de los declarados @Expose() (ClassSerializerInterceptor excludeAll)", async () => {
    const token = await sign(randomUUID());
    const response = await fastify.inject({
      method: "POST",
      url: "/v1/contacts",
      headers: { authorization: `Bearer ${token}` },
      payload: { displayName: "Solo Nombre" },
    });
    const body = response.json<Record<string, unknown>>();
    expect(Object.keys(body).sort()).toEqual(["contactId", "version"]);
  });

  it("list() no filtra por owner_id explícito del cliente: cada owner solo ve lo suyo (RLS + puerto)", async () => {
    const owner = randomUUID();
    const token = await sign(owner);
    await fastify.inject({
      method: "POST",
      url: "/v1/contacts",
      headers: { authorization: `Bearer ${token}` },
      payload: { displayName: "Contacto único de esta prueba" },
    });

    const listResponse = await fastify.inject({
      method: "GET",
      url: "/v1/contacts",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listResponse.statusCode).toBe(200);
    const page = listResponse.json<{ items: Array<{ displayName: string }> }>();
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.displayName).toBe("Contacto único de esta prueba");
  });
});
