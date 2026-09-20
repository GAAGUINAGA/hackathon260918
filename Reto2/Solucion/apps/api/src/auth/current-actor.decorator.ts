import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { ActorContext } from "@ssot/application";
import type { FastifyRequest } from "fastify";

export interface RequestWithActor extends FastifyRequest {
  actor?: ActorContext;
}

/** El controlador nunca lee `owner_id` de un parámetro del cliente (RT-01). */
export const CurrentActor = createParamDecorator((_data: unknown, ctx: ExecutionContext): ActorContext => {
  const request = ctx.switchToHttp().getRequest<RequestWithActor>();
  if (request.actor === undefined) {
    throw new Error("CurrentActor usado fuera de una ruta protegida por JwtAuthGuard.");
  }
  return request.actor;
});
