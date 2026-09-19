import type { Contact } from "@ssot/domain";
import type { ActorContext } from "../authorization/actor-context.js";

/**
 * Puerto de salida de escritura (ADR-01, ADR-04). El `owner_id` viaja
 * siempre dentro de `ActorContext` (RT-01) — nunca como parámetro
 * independiente que un adaptador pudiera recibir manipulado.
 *
 * `operation` acompaña cada `save` para que el adaptador real (Fase 3)
 * pueda derivar la entrada de `contact_revisions` (RT-10) sin que la
 * aplicación conozca la forma de esa tabla.
 */
export type ContactMutationOperation =
  | "create"
  | "update"
  | "withdraw"
  | "restore"
  | "restore_revision"
  | "merge";

export interface ContactRepositoryPort {
  save(actor: ActorContext, contact: Contact, operation: ContactMutationOperation): Promise<void>;
  findById(actor: ActorContext, contactId: string): Promise<Contact | null>;
}
