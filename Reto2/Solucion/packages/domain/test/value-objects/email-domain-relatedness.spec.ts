import { describe, expect, it } from "vitest";
import {
  areDomainsRelated,
  canonicalDomainPairKey,
  getRegistrableDomain,
  isFreeEmailProvider,
} from "../../src/value-objects/email-domain-relatedness.js";

describe("getRegistrableDomain", () => {
  it("devuelve el dominio tal cual cuando solo tiene dos etiquetas", () => {
    expect(getRegistrableDomain("empresa.com")).toBe("empresa.com");
  });

  it("reconoce sufijos públicos multi-etiqueta conocidos (edu.ec)", () => {
    expect(getRegistrableDomain("puce.edu.ec")).toBe("puce.edu.ec");
  });

  it("colapsa subdominios bajo el mismo dominio registrable", () => {
    expect(getRegistrableDomain("mail.empresa.com")).toBe("empresa.com");
    expect(getRegistrableDomain("sales.acme.co.uk")).toBe("acme.co.uk");
  });
});

describe("isFreeEmailProvider", () => {
  it("identifica proveedores de correo masivo", () => {
    expect(isFreeEmailProvider("gmail.com")).toBe(true);
    expect(isFreeEmailProvider("empresa.com")).toBe(false);
  });
});

describe("areDomainsRelated (ADR-18a)", () => {
  it("relaciona dominios que comparten el mismo dominio registrable base", () => {
    expect(areDomainsRelated("sales.acme.com", "hr.acme.com")).toBe(true);
  });

  it("relaciona un dominio con su subdominio (jdoe@empresa.com / jdoe@mail.empresa.com)", () => {
    expect(areDomainsRelated("empresa.com", "mail.empresa.com")).toBe(true);
  });

  it("dos dominios de correo masivo compartidos no emparentan nada (gmail.com)", () => {
    expect(areDomainsRelated("gmail.com", "gmail.com")).toBe(false);
  });

  it("no relaciona dominios corporativos sin conexión conocida", () => {
    expect(areDomainsRelated("empresa.com", "otra-empresa.com")).toBe(false);
  });

  it("usa la tabla de alias inyectada para el caso institucional (puce.edu.ec / puce.ec)", () => {
    // Sin alias conocido: no son ni el mismo dominio registrable ni subdominio
    // entre sí; el emparejamiento depende de la tabla de alias (Fase 3, infra).
    expect(areDomainsRelated("puce.edu.ec", "puce.ec")).toBe(false);

    const knownAliases = new Set([canonicalDomainPairKey("puce.edu.ec", "puce.ec")]);
    expect(areDomainsRelated("puce.edu.ec", "puce.ec", knownAliases)).toBe(true);
  });

  it("canonicalDomainPairKey es simétrico", () => {
    expect(canonicalDomainPairKey("a.com", "b.com")).toBe(canonicalDomainPairKey("b.com", "a.com"));
  });
});
