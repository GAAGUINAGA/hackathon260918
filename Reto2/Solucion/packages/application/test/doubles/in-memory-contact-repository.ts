import type { Contact } from "@ssot/domain";
import type { ActorContext } from "../../src/authorization/actor-context.js";
import type {
  ContactMutationOperation,
  ContactRepositoryPort,
} from "../../src/ports/contact-repository.port.js";

/**
 * Doble de prueba en memoria (CLAUDE.md, Fase 2). Aplica RT-01 igual que un
 * adaptador real lo haría: toda operación está acotada por `actor.ownerId`.
 */
export class InMemoryContactRepository implements ContactRepositoryPort {
  private readonly byId = new Map<string, Contact>();
  readonly savedOperations: ContactMutationOperation[] = [];

  async save(actor: ActorContext, contact: Contact, operation: ContactMutationOperation): Promise<void> {
    if (contact.ownerId !== actor.ownerId) {
      throw new Error("RT-01: intento de persistir un contacto fuera del propietario del actor.");
    }
    this.byId.set(contact.id, contact);
    this.savedOperations.push(operation);
  }

  async findById(actor: ActorContext, contactId: string): Promise<Contact | null> {
    const contact = this.byId.get(contactId);
    if (contact === undefined || contact.ownerId !== actor.ownerId) {
      return null;
    }
    return contact;
  }
}
