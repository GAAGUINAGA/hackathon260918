import { err, ok, type Result } from "neverthrow";
import { Contact, EmailAddress, PhoneNumber, type ContactEmailEntry, type ContactPhoneEntry, type ValidationError } from "@ssot/domain";
import type { ActorContext } from "../authorization/actor-context.js";
import type { ContactRepositoryPort } from "../ports/contact-repository.port.js";
import type { OutboxPort } from "../ports/outbox.port.js";

/**
 * UC-01: Crear contacto local (Crítica). [Interfaz] ya validó el esquema
 * con `zod` y resolvió `owner_id` del token (RT-01); este caso de uso
 * recibe el comando y orquesta dominio + puertos, sin saber de HTTP ni de
 * la base de datos.
 */

export interface EmailInput {
  readonly raw: string;
  readonly isPrincipal?: boolean;
}

export interface PhoneInput {
  readonly raw: string;
  readonly region?: string;
  readonly isPrincipal?: boolean;
}

export interface CrearContactoCommand {
  readonly displayName?: string;
  readonly company?: string;
  readonly title?: string;
  readonly notes?: string;
  readonly emails?: readonly EmailInput[];
  readonly phones?: readonly PhoneInput[];
}

export interface CrearContactoOutput {
  readonly contactId: string;
  readonly version: number;
}

export class CrearContacto {
  constructor(
    private readonly contactRepository: ContactRepositoryPort,
    private readonly outbox: OutboxPort,
    private readonly generateId: () => string,
  ) {}

  async execute(
    actor: ActorContext,
    command: CrearContactoCommand,
  ): Promise<Result<CrearContactoOutput, ValidationError>> {
    const emailsResult = buildEmailEntries(command.emails ?? []);
    if (emailsResult.isErr()) {
      return err(emailsResult.error);
    }

    const phonesResult = buildPhoneEntries(command.phones ?? []);
    if (phonesResult.isErr()) {
      return err(phonesResult.error);
    }

    const contactResult = Contact.create({
      id: this.generateId(),
      ownerId: actor.ownerId,
      ...(command.displayName !== undefined ? { displayName: command.displayName } : {}),
      ...(command.company !== undefined ? { company: command.company } : {}),
      ...(command.title !== undefined ? { title: command.title } : {}),
      ...(command.notes !== undefined ? { notes: command.notes } : {}),
      emails: emailsResult.value,
      phones: phonesResult.value,
    });
    if (contactResult.isErr()) {
      return err(contactResult.error);
    }

    const contact = contactResult.value;

    // [Infraestructura] En Fase 3, save() persiste el contacto y su entrada
    // de auditoría (RT-10) en una sola transacción.
    await this.contactRepository.save(actor, contact, "create");

    // [Infraestructura] En la misma transacción se inserta dedupe:scan en el
    // Outbox (RT-04, UC-01 paso 5). El puerto es la promesa de esa garantía;
    // la aplicación no conoce la transacción real.
    await this.outbox.enqueue(actor, {
      type: "dedupe:scan",
      payload: { contactId: contact.id, ownerId: actor.ownerId },
    });

    return ok({ contactId: contact.id, version: contact.version });
  }
}

function buildEmailEntries(inputs: readonly EmailInput[]): Result<ContactEmailEntry[], ValidationError> {
  const entries: ContactEmailEntry[] = [];
  for (const input of inputs) {
    const result = EmailAddress.create(input.raw);
    if (result.isErr()) {
      return err(result.error);
    }
    entries.push({ value: result.value, isPrincipal: input.isPrincipal ?? false, userLocked: false });
  }
  return ok(entries);
}

function buildPhoneEntries(inputs: readonly PhoneInput[]): Result<ContactPhoneEntry[], ValidationError> {
  const entries: ContactPhoneEntry[] = [];
  for (const input of inputs) {
    const result = PhoneNumber.create(input.raw, input.region);
    if (result.isErr()) {
      return err(result.error);
    }
    entries.push({ value: result.value, isPrincipal: input.isPrincipal ?? false, userLocked: false });
  }
  return ok(entries);
}
