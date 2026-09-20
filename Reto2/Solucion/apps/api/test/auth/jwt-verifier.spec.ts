import { exportJWK, generateKeyPair, SignJWT, type JWTVerifyGetKey, type KeyLike } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { JwtVerificationError, JwtVerifier } from "../../src/auth/jwt-verifier.js";

const ISSUER = "https://project.supabase.co/auth/v1";
const AUDIENCE = "authenticated";
const KID = "test-key-1";

async function localGetKey(): Promise<{ getKey: JWTVerifyGetKey; privateKey: KeyLike }> {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  const jwks = { keys: [{ ...jwk, kid: KID, alg: "RS256", use: "sig" }] };

  const getKey: JWTVerifyGetKey = async (header) => {
    const found = jwks.keys.find((k) => k.kid === header.kid);
    if (found === undefined) throw new Error("kid no encontrado");
    const { importJWK } = await import("jose");
    return importJWK(found, "RS256");
  };

  return { getKey, privateKey };
}

async function signToken(
  privateKey: KeyLike,
  claims: Record<string, unknown>,
  overrides: { issuer?: string; audience?: string; expiresIn?: string | number } = {},
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: KID })
    .setIssuedAt()
    .setIssuer(overrides.issuer ?? ISSUER)
    .setAudience(overrides.audience ?? AUDIENCE)
    .setExpirationTime(overrides.expiresIn ?? "5m")
    .sign(privateKey);
}

describe("JwtVerifier (UC-08, ADR-05, RT-12)", () => {
  let verifier: JwtVerifier;
  let privateKey: KeyLike;

  beforeAll(async () => {
    const { getKey, privateKey: key } = await localGetKey();
    privateKey = key;
    verifier = new JwtVerifier(getKey, ISSUER, AUDIENCE);
  });

  it("verifica un token válido y devuelve sub/aal", async () => {
    const token = await signToken(privateKey, { sub: "user-123", aal: "aal1" });
    const claims = await verifier.verify(token);
    expect(claims.sub).toBe("user-123");
    expect(claims.aal).toBe("aal1");
  });

  it("rechaza un token con firma alterada", async () => {
    const token = await signToken(privateKey, { sub: "user-123" });
    const tampered = `${token.slice(0, -4)}abcd`;
    await expect(verifier.verify(tampered)).rejects.toThrow(JwtVerificationError);
  });

  it("rechaza un emisor incorrecto (UC-08, flujo 3a)", async () => {
    const token = await signToken(privateKey, { sub: "user-123" }, { issuer: "https://otro-issuer.example" });
    await expect(verifier.verify(token)).rejects.toThrow(JwtVerificationError);
  });

  it("rechaza una audiencia distinta (UC-08, flujo 3a)", async () => {
    const token = await signToken(privateKey, { sub: "user-123" }, { audience: "otra-audiencia" });
    await expect(verifier.verify(token)).rejects.toThrow(JwtVerificationError);
  });

  it("rechaza un token expirado", async () => {
    const expiredEpochSeconds = Math.floor(Date.now() / 1000) - 60;
    const token = await signToken(privateKey, { sub: "user-123" }, { expiresIn: expiredEpochSeconds });
    await expect(verifier.verify(token)).rejects.toThrow(JwtVerificationError);
  });

  it("rechaza un token sin claim sub", async () => {
    const token = await signToken(privateKey, {});
    await expect(verifier.verify(token)).rejects.toThrow(JwtVerificationError);
  });
});
