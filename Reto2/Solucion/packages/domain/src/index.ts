/**
 * Anillo 0 (Dominio puro). Prohibido importar librerias de infraestructura,
 * HTTP, ORM o red (ADR-09, regla domain-is-pure).
 *
 * Se implementa en Fase 1: Value Objects (EmailAddress, PhoneNumber),
 * normalizaciones (NFKC, unaccent, E.164) y motor de puntuacion de
 * deduplicacion (ADR-18a).
 */
export {};
