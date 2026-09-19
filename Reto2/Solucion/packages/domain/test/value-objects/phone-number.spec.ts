import { describe, expect, it } from "vitest";
import { PhoneNumber } from "../../src/value-objects/phone-number.js";

describe("PhoneNumber.create", () => {
  it("es imposible instanciar un teléfono vacío (ADR-10)", () => {
    const result = PhoneNumber.create("");
    expect(result.isErr()).toBe(true);
  });

  it("rechaza entradas sin dígitos plausibles", () => {
    const result = PhoneNumber.create("no-es-un-telefono");
    expect(result.isErr()).toBe(true);
  });

  it("acepta un número ya en formato internacional", () => {
    const result = PhoneNumber.create("+593 99 123 4567");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.e164).toBe("+593991234567");
      expect(result.value.isNormalized).toBe(true);
    }
  });

  it("normaliza usando la región del perfil cuando falta el prefijo (UC-01)", () => {
    const result = PhoneNumber.create("0991234567", "EC");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.e164).toBe("+593991234567");
    }
  });

  it("no duplica el código de país cuando la entrada ya lo incluye sin '+' (regresión AUDITORIA#1 M-01)", () => {
    const result = PhoneNumber.create("593991234567", "EC");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.e164).toBe("+593991234567");
    }
  });

  it("no duplica el código de país con formato embebido con separadores (regresión AUDITORIA#1 M-01)", () => {
    const result = PhoneNumber.create("(593) 991-234-567", "EC");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.e164).toBe("+593991234567");
    }
  });

  it("invariante: el E.164 generado con región nunca repite el código de país", () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["0991234567", "EC"],
      ["593991234567", "EC"],
      ["2345678", "EC"],
    ];
    for (const [raw, region] of cases) {
      const result = PhoneNumber.create(raw, region);
      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.e164 !== null) {
        const callingCode = "593";
        const withoutSign = result.value.e164.slice(1);
        const occurrences = withoutSign.split(callingCode).length - 1;
        expect(occurrences).toBeLessThanOrEqual(1);
      }
    }
  });

  it("dos formatos distintos del mismo teléfono producen el mismo valor almacenado (UC-01, criterio de aceptación)", () => {
    const local = PhoneNumber.create("099-123-4567", "EC");
    const international = PhoneNumber.create("+593991234567");
    expect(local.isOk() && local.value.e164).toBe(international.isOk() && international.value.e164);
  });

  it("acepta 00 como prefijo internacional alterno", () => {
    const result = PhoneNumber.create("00593991234567");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.e164).toBe("+593991234567");
    }
  });

  it("conserva en crudo un teléfono sin región inferible en lugar de rechazarlo (UC-01, flujo 3c)", () => {
    const result = PhoneNumber.create("0991234567");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.isNormalized).toBe(false);
      expect(result.value.e164).toBeNull();
      expect(result.value.rawInput).toBe("0991234567");
    }
  });

  it("conserva en crudo cuando la región es desconocida por el sistema", () => {
    const result = PhoneNumber.create("0991234567", "ZZ");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.isNormalized).toBe(false);
    }
  });
});
