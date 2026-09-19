import { describe, expect, it } from "vitest";
import { EmailAddress } from "../../src/value-objects/email-address.js";
import { PhoneNumber } from "../../src/value-objects/phone-number.js";
import {
  isRelatedEmailDomainSameLocal,
  isSameE164Phone,
  isSameNormalizedEmail,
} from "../../src/dedup/blocking.js";

function email(raw: string): EmailAddress {
  const result = EmailAddress.create(raw);
  if (result.isErr()) throw new Error(`fixture inválida: ${raw}`);
  return result.value;
}

function phone(raw: string, region?: string): PhoneNumber {
  const result = PhoneNumber.create(raw, region);
  if (result.isErr()) throw new Error(`fixture inválida: ${raw}`);
  return result.value;
}

describe("B1 — isSameNormalizedEmail", () => {
  it("compara por valor normalizado, no por forma original", () => {
    expect(isSameNormalizedEmail(email("Jose@Empresa.com"), email("jose@empresa.com"))).toBe(true);
  });
});

describe("B2 — isSameE164Phone", () => {
  it("compara por E.164, sin importar el formato de entrada", () => {
    expect(isSameE164Phone(phone("099-123-4567", "EC"), phone("+593991234567"))).toBe(true);
  });

  it("dos teléfonos unnormalized nunca coinciden por esta vía", () => {
    expect(isSameE164Phone(phone("0991234567"), phone("0991234567"))).toBe(false);
  });
});

describe("B4 — isRelatedEmailDomainSameLocal (UC-03, ADR-18a)", () => {
  it("jdoe@empresa.com y jdoe@mail.empresa.com producen la señal B4", () => {
    expect(isRelatedEmailDomainSameLocal(email("jdoe@empresa.com"), email("jdoe@mail.empresa.com"))).toBe(true);
  });

  it("dos contactos que solo comparten gmail.com no generan la señal B4", () => {
    expect(isRelatedEmailDomainSameLocal(email("jose@gmail.com"), email("jose@gmail.com"))).toBe(false);
  });

  it("no dispara cuando el dominio es idéntico (eso es B1, no B4)", () => {
    expect(isRelatedEmailDomainSameLocal(email("jose@empresa.com"), email("jose@empresa.com"))).toBe(false);
  });

  it("no dispara si la parte local difiere", () => {
    expect(isRelatedEmailDomainSameLocal(email("jose@empresa.com"), email("maria@mail.empresa.com"))).toBe(false);
  });
});
