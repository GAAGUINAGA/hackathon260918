import { describe, expect, it } from "vitest";
import { EmailAddress } from "../../src/value-objects/email-address.js";
import { PhoneNumber } from "../../src/value-objects/phone-number.js";
import { canonicalDomainPairKey } from "../../src/value-objects/email-domain-relatedness.js";
import { scoreDedupCandidate, type DedupMatchCandidate } from "../../src/dedup/scoring.js";

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

describe("scoreDedupCandidate (UC-03, Etapa 2)", () => {
  it("correo y teléfono idénticos saturan en 1.0 y producen auto_merged", () => {
    const a: DedupMatchCandidate = { emailAddress: email("ana@empresa.com"), phoneNumber: phone("+593991234567") };
    const b: DedupMatchCandidate = { emailAddress: email("ana@empresa.com"), phoneNumber: phone("+593991234567") };

    const result = scoreDedupCandidate(a, b);

    expect(result.score).toBe(1);
    expect(result.hasStrongIdentifierMatch).toBe(true);
    expect(result.decision).toBe("auto_merged");
  });

  it("B4 (g.aguinaga@puce.edu.ec vs g.aguinaga@puce.ec, con alias) produce pending, nunca auto_merged", () => {
    const a: DedupMatchCandidate = {
      emailAddress: email("g.aguinaga@puce.edu.ec"),
      displayName: "Gabriela Aguinaga",
    };
    const b: DedupMatchCandidate = {
      emailAddress: email("g.aguinaga@puce.ec"),
      displayName: "Gabriela Aguinaga",
    };
    const knownAliases = new Set([canonicalDomainPairKey("puce.edu.ec", "puce.ec")]);

    const result = scoreDedupCandidate(a, b, knownAliases);

    expect(result.hasStrongIdentifierMatch).toBe(false);
    expect(result.decision).toBe("pending");
  });

  it("B4 nunca califica como identificador fuerte, ni siquiera si el score alcanza 0.90 combinado con otras señales débiles", () => {
    // related_email_domain_same_local (0.35) + name_similarity máxima (0.25) +
    // company_and_title_match (0.10) = 0.70 — insuficiente para 0.90, pero
    // este caso documenta explícitamente que aunque lo fuera, sin identificador
    // fuerte jamás decide auto_merged (regla explícita de UC-03).
    const a: DedupMatchCandidate = {
      emailAddress: email("jdoe@empresa.com"),
      displayName: "John Doe",
      company: "Acme",
      title: "Engineer",
    };
    const b: DedupMatchCandidate = {
      emailAddress: email("jdoe@mail.empresa.com"),
      displayName: "John Doe",
      company: "Acme",
      title: "Engineer",
    };

    const result = scoreDedupCandidate(a, b);

    expect(result.hasStrongIdentifierMatch).toBe(false);
    expect(result.decision).not.toBe("auto_merged");
    expect(result.decision).toBe("pending");
  });

  it("un par sin señales relevantes se descarta", () => {
    const a: DedupMatchCandidate = { company: "Acme", title: "Engineer" };
    const b: DedupMatchCandidate = { company: "Acme", title: "Engineer" };

    const result = scoreDedupCandidate(a, b);

    expect(result.score).toBeCloseTo(0.1);
    expect(result.decision).toBe("discarded");
  });

  it("aplica la penalización de -0.30 cuando ambos vienen de la misma cuenta de integración", () => {
    const baseA: DedupMatchCandidate = { company: "Acme", title: "Engineer", emailAddress: email("jdoe@empresa.com") };
    const baseB: DedupMatchCandidate = {
      company: "Acme",
      title: "Engineer",
      emailAddress: email("jdoe@mail.empresa.com"),
    };
    const sameAccountA: DedupMatchCandidate = { ...baseA, integrationAccountId: "acc-1" };
    const sameAccountB: DedupMatchCandidate = { ...baseB, integrationAccountId: "acc-1" };

    const withoutPenalty = scoreDedupCandidate(baseA, baseB);
    const withPenalty = scoreDedupCandidate(sameAccountA, sameAccountB);

    expect(withPenalty.score).toBeLessThan(withoutPenalty.score);
  });

  it("cada señal aplicada queda registrada con su peso para explicar la decisión", () => {
    const a: DedupMatchCandidate = { emailAddress: email("ana@empresa.com") };
    const b: DedupMatchCandidate = { emailAddress: email("ana@empresa.com") };

    const result = scoreDedupCandidate(a, b);

    expect(result.signals).toEqual([
      expect.objectContaining({ code: "same_normalized_email", weight: 0.55 }),
    ]);
  });
});
