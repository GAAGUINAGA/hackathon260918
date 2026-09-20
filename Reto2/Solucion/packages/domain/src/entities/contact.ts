import { err, ok, type Result } from "neverthrow";
import { validationError, type ValidationError } from "../errors/validation-error.js";
import type { EmailAddress } from "../value-objects/email-address.js";
import type { PhoneNumber } from "../value-objects/phone-number.js";

/**
 * `Contact` (Anillo 0). Agregado raíz del dominio de identidad (UC-01).
 *
 * Campos y su semántica (planeacion_v.2.1.2 §4.1, ADR-21):
 * - `state`: ¿existe y es visible? (`true`/`false`).
 * - `withdrawnAt`: cuándo se retiró; nulo mientras `state = true`.
 * - `status`: ciclo de vida (`active`/`merged`), independiente de `state`.
 *
 * `displayName`/`company`/`title`/`notes` se validan aquí mismo (recorte,
 * longitud) en lugar de fábricas de Value Object dedicadas: ADR-10 exige
 * fábricas cerradas para los campos con reglas de negocio propias
 * (correo, teléfono); estos son texto libre sin más invariante que su
 * longitud, así que un VO adicional sería indirección sin beneficio (KISS).
 */

export type ContactStatus = "active" | "merged";

export interface ContactEmailEntry {
  readonly value: EmailAddress;
  readonly isPrincipal: boolean;
  readonly userLocked: boolean;
}

export interface ContactPhoneEntry {
  readonly value: PhoneNumber;
  readonly isPrincipal: boolean;
  readonly userLocked: boolean;
}

export interface CreateContactParams {
  readonly id: string;
  readonly ownerId: string;
  readonly displayName?: string;
  readonly company?: string;
  readonly title?: string;
  readonly notes?: string;
  readonly emails?: readonly ContactEmailEntry[];
  readonly phones?: readonly ContactPhoneEntry[];
}

const MAX_FREE_TEXT_LENGTH = 500;

export class Contact {
  private constructor(
    public readonly id: string,
    public readonly ownerId: string,
    public readonly state: boolean,
    public readonly status: ContactStatus,
    public readonly withdrawnAt: Date | null,
    public readonly version: number,
    public readonly displayName: string | null,
    public readonly company: string | null,
    public readonly title: string | null,
    public readonly notes: string | null,
    public readonly emails: readonly ContactEmailEntry[],
    public readonly phones: readonly ContactPhoneEntry[],
  ) {}

  /** UC-01: crea un contacto nuevo, versión 1, vivo y activo. */
  static create(params: CreateContactParams): Result<Contact, ValidationError> {
    if (params.id.trim().length === 0) {
      return err(validationError("contact_missing_id", "El contacto requiere un identificador.", "id"));
    }
    if (params.ownerId.trim().length === 0) {
      return err(validationError("contact_missing_owner", "El contacto requiere un propietario.", "ownerId"));
    }

    const displayName = normalizeFreeText(params.displayName);
    const company = normalizeFreeText(params.company);
    const title = normalizeFreeText(params.title);
    const notes = normalizeFreeText(params.notes);

    for (const [field, value] of [
      ["displayName", displayName],
      ["company", company],
      ["title", title],
      ["notes", notes],
    ] as const) {
      if (value !== null && value.length > MAX_FREE_TEXT_LENGTH) {
        return err(validationError("contact_field_too_long", `El campo ${field} excede la longitud máxima.`, field));
      }
    }

    const emails = params.emails ?? [];
    const phones = params.phones ?? [];

    // UC-01, flujo 3b: se rechaza un contacto sin al menos un identificador
    // significativo (nombre, correo o teléfono).
    if (displayName === null && emails.length === 0 && phones.length === 0) {
      return err(
        validationError(
          "contact_empty",
          "El contacto necesita al menos un identificador significativo: nombre, correo o teléfono.",
        ),
      );
    }

    if (countPrincipal(emails) > 1) {
      return err(validationError("contact_multiple_principal_email", "Solo un correo puede ser principal.", "emails"));
    }
    if (countPrincipal(phones) > 1) {
      return err(validationError("contact_multiple_principal_phone", "Solo un teléfono puede ser principal.", "phones"));
    }

    // RT-16: la persistencia real impone un índice único parcial por
    // propietario y valor normalizado. Rechazarlo aquí evita que el dominio
    // acepte un agregado que F3 no podría guardar.
    if (hasDuplicateNormalizedValue(emails, (entry) => entry.value.value)) {
      return err(
        validationError("contact_duplicate_identifier", "Un mismo correo no puede repetirse en el contacto.", "emails"),
      );
    }
    if (hasDuplicateNormalizedValue(phones, phoneDedupKey)) {
      return err(
        validationError(
          "contact_duplicate_identifier",
          "Un mismo teléfono no puede repetirse en el contacto.",
          "phones",
        ),
      );
    }

    return ok(
      new Contact(
        params.id,
        params.ownerId,
        true,
        "active",
        null,
        1,
        displayName,
        company,
        title,
        notes,
        emails,
        phones,
      ),
    );
  }

  /**
   * Reconstrucción de confianza para infraestructura (Fase 3): rehidrata un
   * `Contact` completo (incluidos `state`/`status`/`version`/`withdrawnAt`)
   * desde una fila ya persistida. Nunca revalida — los invariantes ya se
   * comprobaron cuando el contacto se creó o mutó por última vez. Nunca
   * debe usarse con datos de origen externo — esa ruta es `create`.
   */
  static restore(params: {
    readonly id: string;
    readonly ownerId: string;
    readonly state: boolean;
    readonly status: ContactStatus;
    readonly withdrawnAt: Date | null;
    readonly version: number;
    readonly displayName: string | null;
    readonly company: string | null;
    readonly title: string | null;
    readonly notes: string | null;
    readonly emails: readonly ContactEmailEntry[];
    readonly phones: readonly ContactPhoneEntry[];
  }): Contact {
    return new Contact(
      params.id,
      params.ownerId,
      params.state,
      params.status,
      params.withdrawnAt,
      params.version,
      params.displayName,
      params.company,
      params.title,
      params.notes,
      params.emails,
      params.phones,
    );
  }

  /**
   * UC-13: retiro lógico (RT-14). Nunca un DELETE; el cascade lo aplica el
   * caso de uso (RT-18). Idempotente: un contacto ya retirado se devuelve
   * sin cambios (preserva el `withdrawnAt` original) en lugar de fabricar
   * una segunda transición — UC-21/RT-17 dependen de que ese testimonio no
   * cambie una vez fijado.
   */
  withdraw(withdrawnAt: Date): Contact {
    if (!this.state) {
      return this;
    }
    return new Contact(
      this.id,
      this.ownerId,
      false,
      this.status,
      withdrawnAt,
      this.version,
      this.displayName,
      this.company,
      this.title,
      this.notes,
      this.emails,
      this.phones,
    );
  }
}

function countPrincipal(entries: readonly { readonly isPrincipal: boolean }[]): number {
  return entries.filter((entry) => entry.isPrincipal).length;
}

function phoneDedupKey(entry: ContactPhoneEntry): string {
  return entry.value.isNormalized && entry.value.e164 !== null ? entry.value.e164 : entry.value.rawInput;
}

function hasDuplicateNormalizedValue<T>(entries: readonly T[], keyOf: (entry: T) => string): boolean {
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = keyOf(entry);
    if (seen.has(key)) {
      return true;
    }
    seen.add(key);
  }
  return false;
}

function normalizeFreeText(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
