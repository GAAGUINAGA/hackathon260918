import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

/**
 * Verificación de JWT sin estado contra el JWKS de Supabase Auth (ADR-05,
 * RT-12). El backend nunca emite, firma ni almacena credenciales; solo
 * verifica firma, emisor, audiencia y vigencia.
 *
 * `createRemoteJWKSet` de `jose` ya implementa caché + refresco del JWKS
 * cuando un `kid` desconocido aparece (UC-08, flujo 3b), con cooldown
 * interno para no convertirse en vector de DoS contra el IDP.
 */
export interface VerifiedClaims {
  /** Claim `sub`: único origen válido de `owner_id` (RT-01). */
  readonly sub: string;
  /** Nivel de garantía de autenticación (Supabase: `aal1`/`aal2`). */
  readonly aal: string | undefined;
}

export class JwtVerificationError extends Error {
  constructor() {
    super("Token inválido: firma, emisor, audiencia o vigencia no verificados.");
    this.name = "JwtVerificationError";
  }
}

export class JwtVerifier {
  constructor(
    private readonly getKey: JWTVerifyGetKey,
    private readonly issuer: string,
    private readonly audience: string,
  ) {}

  async verify(token: string): Promise<VerifiedClaims> {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, this.getKey, {
        issuer: this.issuer,
        audience: this.audience,
      }));
    } catch {
      // 3a (UC-08): firma alterada, emisor incorrecto o audiencia distinta
      // -> 401 genérico. No se filtra la causa exacta (RT-07).
      throw new JwtVerificationError();
    }

    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new JwtVerificationError();
    }

    return { sub: payload.sub, aal: typeof payload["aal"] === "string" ? payload["aal"] : undefined };
  }
}

export function createRemoteJwtVerifier(jwksUrl: string, issuer: string, audience: string): JwtVerifier {
  return new JwtVerifier(createRemoteJWKSet(new URL(jwksUrl)), issuer, audience);
}
