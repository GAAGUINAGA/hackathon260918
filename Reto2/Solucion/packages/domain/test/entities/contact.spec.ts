import { describe, expect, it } from "vitest";
import { Contact, type ContactEmailEntry, type ContactPhoneEntry } from "../../src/entities/contact.js";
import { EmailAddress } from "../../src/value-objects/email-address.js";
import { PhoneNumber } from "../../src/value-objects/phone-number.js";

function emailEntry(raw: string, overrides: Partial<Omit<ContactEmailEntry, "value">> = {}): ContactEmailEntry {
  const result = EmailAddress.create(raw);
  if (result.isErr()) throw new Error(`fixture inválida: ${raw}`);
  return { value: result.value, isPrincipal: false, userLocked: false, ...overrides };
}

function phoneEntry(
  raw: string,
  region: string | undefined = undefined,
  overrides: Partial<Omit<ContactPhoneEntry, "value">> = {},
): ContactPhoneEntry {
  const result = PhoneNumber.create(raw, region);
  if (result.isErr()) throw new Error(`fixture inválida: ${raw}`);
  return { value: result.value, isPrincipal: false, userLocked: false, ...overrides };
}

describe("Contact.create (UC-01)", () => {
  it("crea un contacto vivo, activo, en versión 1", () => {
    const result = Contact.create({ id: "c1", ownerId: "owner-1", displayName: "Ana Pérez" });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.state).toBe(true);
      expect(result.value.status).toBe("active");
      expect(result.value.withdrawnAt).toBeNull();
      expect(result.value.version).toBe(1);
    }
  });

  it("rechaza un contacto sin id o sin propietario (RT-01)", () => {
    expect(Contact.create({ id: "", ownerId: "owner-1", displayName: "Ana" }).isErr()).toBe(true);
    expect(Contact.create({ id: "c1", ownerId: "", displayName: "Ana" }).isErr()).toBe(true);
  });

  it("rechaza un contacto sin ningún identificador significativo (UC-01, flujo 3b)", () => {
    const result = Contact.create({ id: "c1", ownerId: "owner-1" });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("contact_empty");
    }
  });

  it("acepta un contacto identificado solo por correo, sin nombre", () => {
    const result = Contact.create({ id: "c1", ownerId: "owner-1", emails: [emailEntry("ana@empresa.com")] });
    expect(result.isOk()).toBe(true);
  });

  it("rechaza más de un correo marcado como principal", () => {
    const result = Contact.create({
      id: "c1",
      ownerId: "owner-1",
      emails: [
        emailEntry("ana@empresa.com", { isPrincipal: true }),
        emailEntry("ana.personal@gmail.com", { isPrincipal: true }),
      ],
    });
    expect(result.isErr()).toBe(true);
  });

  it("descarta campos de texto libre en blanco (recorte a null)", () => {
    const result = Contact.create({ id: "c1", ownerId: "owner-1", displayName: "Ana", notes: "   " });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.notes).toBeNull();
    }
  });

  it("rechaza correos duplicados dentro del mismo agregado (RT-16, AUDITORIA#2 m-02)", () => {
    const result = Contact.create({
      id: "c1",
      ownerId: "owner-1",
      emails: [emailEntry("Ana@Empresa.com"), emailEntry("ana@empresa.com")],
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("contact_duplicate_identifier");
    }
  });

  it("rechaza teléfonos duplicados dentro del mismo agregado (RT-16, AUDITORIA#2 m-02)", () => {
    const result = Contact.create({
      id: "c1",
      ownerId: "owner-1",
      phones: [phoneEntry("0991234567", "EC"), phoneEntry("+593991234567")],
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("contact_duplicate_identifier");
    }
  });

  it("permite dos teléfonos unnormalized distintos aunque no puedan compararse por E.164", () => {
    const result = Contact.create({
      id: "c1",
      ownerId: "owner-1",
      phones: [phoneEntry("0991234567"), phoneEntry("0987654321")],
    });
    expect(result.isOk()).toBe(true);
  });
});

describe("Contact.withdraw (UC-13)", () => {
  it("retira el contacto: state=false, withdrawnAt fijado, status no cambia (§4.1)", () => {
    const created = Contact.create({ id: "c1", ownerId: "owner-1", displayName: "Ana" });
    if (created.isErr()) throw new Error("fixture inválida");

    const withdrawnAt = new Date("2026-01-01T00:00:00Z");
    const withdrawn = created.value.withdraw(withdrawnAt);

    expect(withdrawn.state).toBe(false);
    expect(withdrawn.withdrawnAt).toBe(withdrawnAt);
    expect(withdrawn.status).toBe("active");
    expect(withdrawn.version).toBe(created.value.version);
  });

  it("es idempotente: retirar un contacto ya retirado no cambia withdrawnAt (AUDITORIA#2 m-01)", () => {
    const created = Contact.create({ id: "c1", ownerId: "owner-1", displayName: "Ana" });
    if (created.isErr()) throw new Error("fixture inválida");

    const firstWithdrawnAt = new Date("2026-01-01T00:00:00Z");
    const withdrawnOnce = created.value.withdraw(firstWithdrawnAt);

    const secondWithdrawnAt = new Date("2026-02-01T00:00:00Z");
    const withdrawnTwice = withdrawnOnce.withdraw(secondWithdrawnAt);

    expect(withdrawnTwice.withdrawnAt).toBe(firstWithdrawnAt);
    expect(withdrawnTwice).toBe(withdrawnOnce);
  });
});
