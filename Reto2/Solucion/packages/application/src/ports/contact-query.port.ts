import type { ActorContext } from "../authorization/actor-context.js";

/**
 * Puerto de lectura (ADR-19a): un puerto por agregado, no por consulta ni
 * por endpoint. Devuelve DTO planos, nunca entidades de dominio hidratadas.
 * El propietario no es parametrizable: se resuelve de `ActorContext`, igual
 * que en el puerto de escritura — una consulta sin acotación no es
 * expresable en código. UC-11 y UC-12 invocan este puerto directamente
 * desde el controlador, sin caso de uso intermedio (§2.3 del CDU).
 */

export interface ContactSummaryDTO {
  readonly id: string;
  readonly displayName: string | null;
  readonly primaryEmail: string | null;
  readonly primaryPhone: string | null;
  readonly company: string | null;
}

export interface ContactListPage {
  readonly items: readonly ContactSummaryDTO[];
  readonly nextCursor: string | null;
}

export interface ListContactsQuery {
  readonly searchTerm?: string;
  readonly cursor?: string;
  readonly limit: number;
}

export interface ContactQueryPort {
  findSummaryById(actor: ActorContext, contactId: string): Promise<ContactSummaryDTO | null>;
  list(actor: ActorContext, query: ListContactsQuery): Promise<ContactListPage>;
}
