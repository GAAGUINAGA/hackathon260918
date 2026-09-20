import { ForbiddenException, Inject, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createActorContext } from "@ssot/application";
import type { Database } from "@ssot/infrastructure";
import { provisionUserPreferences } from "@ssot/infrastructure";
import type { FastifyRequest } from "fastify";
import { DATABASE } from "../database/database.module.js";
import { JwtVerificationError, JwtVerifier } from "./jwt-verifier.js";
import { JWT_VERIFIER } from "./jwt-verifier.token.js";
import { REQUIRE_MFA_KEY } from "./require-mfa.decorator.js";
import type { RequestWithActor } from "./current-actor.decorator.js";

const BEARER_PREFIX = "Bearer ";

/**
 * UC-08: verifica el JWT contra el JWKS de Supabase (RT-12), deriva
 * `owner_id` exclusivamente del claim `sub` (RT-01), aprovisiona el
 * perfil en la primera petición y aplica la exigencia de MFA cuando la
 * ruta la declara (`@RequireMfa()`).
 *
 * Las dependencias se inyectan con `@Inject()` en el propio constructor,
 * no vía un provider `useFactory` externo: cuando un guard se referencia
 * por clase en `@UseGuards(JwtAuthGuard)`, Nest puede auto-instanciarlo
 * por reflexión de tipos en vez de reutilizar un provider registrado en
 * otro módulo — sin `@Inject()` en los parámetros con token (symbol), esa
 * reflexión no puede resolverlos (verificado con `@nestjs/testing`, ver
 * test/e2e/contacts.e2e.spec.ts).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JWT_VERIFIER) private readonly verifier: JwtVerifier,
    @Inject(DATABASE) private readonly db: Database,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const authHeader = request.headers.authorization;
    if (typeof authHeader !== "string" || !authHeader.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException();
    }
    const token = authHeader.slice(BEARER_PREFIX.length);

    let claims;
    try {
      claims = await this.verifier.verify(token);
    } catch (error) {
      if (error instanceof JwtVerificationError) {
        throw new UnauthorizedException();
      }
      throw error;
    }

    const requiresMfa = this.reflector.getAllAndOverride<boolean>(REQUIRE_MFA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiresMfa === true && claims.aal !== "aal2") {
      throw new ForbiddenException({
        code: "mfa_required",
        message: "Esta ruta exige verificación en dos pasos (MFA) activa.",
      });
    }

    await provisionUserPreferences(this.db, claims.sub);

    (request as RequestWithActor).actor = createActorContext(claims.sub, "user");
    return true;
  }
}
