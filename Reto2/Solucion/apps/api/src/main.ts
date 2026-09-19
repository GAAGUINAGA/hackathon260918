/**
 * Anillo 3 - API HTTP/WebSocket (NestJS + Fastify).
 * Se implementa en Fase 4: controladores REST, gateway WebSocket
 * autenticado en el handshake, guard JWT contra JWKS de Supabase Auth
 * (ADR-05), ClassSerializerInterceptor con excludeAll, rate limiting (RT-09).
 *
 * No inicia hasta que los anillos 0-2 esten cerrados, probados y auditados.
 */
export const RING = "A3-api" as const;
