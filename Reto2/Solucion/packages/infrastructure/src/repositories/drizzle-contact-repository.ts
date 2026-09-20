import type { ActorContext, ContactMutationOperation, ContactRepositoryPort } from "@ssot/application";
import { Contact, EmailAddress, PhoneNumber, type ContactEmailEntry, type ContactPhoneEntry } from "@ssot/domain";
import { eq } from "drizzle-orm";
import type { Database } from "../db/connection.js";
import { contactEmails, contactPhones, contactRevisions, contacts } from "../db/schema/index.js";
import { withOwnerTransaction } from "../db/transaction.js";

/**
 * Adaptador de salida (Anillo 2) de `ContactRepositoryPort` (UC-01, RT-10).
 * Toda escritura activa el opt-in de `state` (ver `WithOwnerTransactionOptions`):
 * es una necesidad de Postgres para que `UPDATE ... WHERE` pueda transicionar
 * `state`, no una relajación de RT-15 (que gobierna lectura, no escritura de
 * una fila ya conocida por id).
 */
export class DrizzleContactRepository implements ContactRepositoryPort {
  constructor(private readonly db: Database) {}

  async save(actor: ActorContext, contact: Contact, operation: ContactMutationOperation): Promise<void> {
    await withOwnerTransaction(
      this.db,
      actor,
      async (tx) => {
        const contactRow = {
          id: contact.id,
          ownerId: contact.ownerId,
          displayName: contact.displayName,
          company: contact.company,
          title: contact.title,
          notes: contact.notes,
          status: contact.status,
          state: contact.state,
          withdrawnAt: contact.withdrawnAt,
          version: contact.version,
        };

        if (operation === "create") {
          await tx.insert(contacts).values(contactRow);
        } else {
          await tx.update(contacts).set(contactRow).where(eq(contacts.id, contact.id));
          // Reconciliación simple (borrar + reinsertar) de los valores
          // múltiples: correcta y suficiente mientras el único caso de uso
          // que muta un contacto existente (Fase 2) es la creación; se
          // revisará por una reconciliación fila-a-fila si UC-02 la necesita
          // por rendimiento.
          await tx.delete(contactEmails).where(eq(contactEmails.contactId, contact.id));
          await tx.delete(contactPhones).where(eq(contactPhones.contactId, contact.id));
        }

        if (contact.emails.length > 0) {
          await tx.insert(contactEmails).values(contact.emails.map((entry) => toEmailRow(contact.id, contact.ownerId, entry)));
        }
        if (contact.phones.length > 0) {
          await tx.insert(contactPhones).values(contact.phones.map((entry) => toPhoneRow(contact.id, contact.ownerId, entry)));
        }

        // RT-10: toda mutación escribe su revisión en la misma transacción.
        await tx.insert(contactRevisions).values({
          contactId: contact.id,
          ownerId: contact.ownerId,
          actorKind: actor.actorKind,
          operation,
          fieldChanges: {},
        });
      },
      { includeRetired: true },
    );
  }

  async findById(actor: ActorContext, contactId: string): Promise<Contact | null> {
    return withOwnerTransaction(this.db, actor, async (tx) => {
      const [row] = await tx.select().from(contacts).where(eq(contacts.id, contactId));
      if (row === undefined) {
        return null;
      }

      const emailRows = await tx.select().from(contactEmails).where(eq(contactEmails.contactId, contactId));
      const phoneRows = await tx.select().from(contactPhones).where(eq(contactPhones.contactId, contactId));

      return Contact.restore({
        id: row.id,
        ownerId: row.ownerId,
        state: row.state,
        status: row.status,
        withdrawnAt: row.withdrawnAt,
        version: row.version,
        displayName: row.displayName,
        company: row.company,
        title: row.title,
        notes: row.notes,
        emails: emailRows.map(toEmailEntry),
        phones: phoneRows.map(toPhoneEntry),
      });
    });
  }
}

function toEmailRow(contactId: string, ownerId: string, entry: ContactEmailEntry) {
  return {
    contactId,
    ownerId,
    value: entry.value.value,
    localPart: entry.value.localPart,
    domain: entry.value.domain,
    emailLocalKey: entry.value.emailLocalKey,
    emailDomainKey: entry.value.emailDomainKey,
    isPrincipal: entry.isPrincipal,
    userLocked: entry.userLocked,
  };
}

function toPhoneRow(contactId: string, ownerId: string, entry: ContactPhoneEntry) {
  return {
    contactId,
    ownerId,
    rawInput: entry.value.rawInput,
    e164: entry.value.e164,
    isNormalized: entry.value.isNormalized,
    isPrincipal: entry.isPrincipal,
    userLocked: entry.userLocked,
  };
}

function toEmailEntry(row: typeof contactEmails.$inferSelect): ContactEmailEntry {
  return {
    value: EmailAddress.restore({
      value: row.value,
      localPart: row.localPart,
      domain: row.domain,
      emailLocalKey: row.emailLocalKey,
      emailDomainKey: row.emailDomainKey,
    }),
    isPrincipal: row.isPrincipal,
    userLocked: row.userLocked,
  };
}

function toPhoneEntry(row: typeof contactPhones.$inferSelect): ContactPhoneEntry {
  return {
    value: PhoneNumber.restore({ rawInput: row.rawInput, e164: row.e164, isNormalized: row.isNormalized }),
    isPrincipal: row.isPrincipal,
    userLocked: row.userLocked,
  };
}
