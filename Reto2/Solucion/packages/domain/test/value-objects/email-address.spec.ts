import { describe, expect, it } from "vitest";
import { EmailAddress } from "../../src/value-objects/email-address.js";

describe("EmailAddress.create", () => {
  it("acepta un correo válido y lo normaliza a minúsculas (UC-01)", () => {
    const result = EmailAddress.create("  Jose.Perez@Empresa.COM ");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.value).toBe("jose.perez@empresa.com");
      expect(result.value.localPart).toBe("jose.perez");
      expect(result.value.domain).toBe("empresa.com");
    }
  });

  it("es imposible instanciar un correo vacío (ADR-10)", () => {
    const result = EmailAddress.create("");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("email_empty");
    }
  });

  it.each(["sin-arroba.com", "dos@@arrobas.com", "sin-dominio@", "@sin-local.com", "con espacio@dominio.com"])(
    "rechaza formas claramente inválidas: %s",
    (invalid) => {
      const result = EmailAddress.create(invalid);
      expect(result.isErr()).toBe(true);
    },
  );

  it("rechaza puntos consecutivos en la parte local", () => {
    const result = EmailAddress.create("jose..perez@empresa.com");
    expect(result.isErr()).toBe(true);
  });

  describe("emailLocalKey (B4, ADR-18a)", () => {
    it("suprime +etiqueta solo en proveedores donde esa equivalencia está documentada", () => {
      const gmail = EmailAddress.create("jose.perez+trabajo@gmail.com");
      const corporate = EmailAddress.create("jose.perez+trabajo@empresa.com");
      expect(gmail.isOk() && gmail.value.emailLocalKey).toBe("joseperez");
      expect(corporate.isOk() && corporate.value.emailLocalKey).toBe("jose.perez+trabajo");
    });

    it("nunca suprime puntos como regla universal (jperez != j.perez en un dominio corporativo)", () => {
      const withDot = EmailAddress.create("j.perez@empresa.com");
      const withoutDot = EmailAddress.create("jperez@empresa.com");
      expect(withDot.isOk() && withDot.value.emailLocalKey).toBe("j.perez");
      expect(withoutDot.isOk() && withoutDot.value.emailLocalKey).toBe("jperez");
    });
  });
});
