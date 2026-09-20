import { err, ok, type Result } from "neverthrow";
import { validationError, type ValidationError } from "../errors/validation-error.js";
import { toNFKC } from "../shared/text-normalization.js";
import { getRegistrableDomain } from "./email-domain-relatedness.js";

const MAX_TOTAL_LENGTH = 254;
const MAX_LOCAL_PART_LENGTH = 64;

// Validación deliberadamente simple (no RFC 5322 completo): rechaza formas
// claramente inválidas sin intentar cubrir direcciones citadas exóticas.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_PART_ALLOWED = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_LABEL = /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/;

const DOT_INSENSITIVE_LOCAL_PART_DOMAINS = new Set(["gmail.com", "googlemail.com"]);
const PLUS_SUBADDRESSING_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "fastmail.com",
]);

/**
 * Value object de correo (ADR-10). Fábrica cerrada: imposible instanciar un
 * correo inválido. `emailLocalKey`/`emailDomainKey` sostienen la señal B4 de
 * deduplicación (ADR-18a, UC-03) y se calculan aquí, en el dominio, para que
 * las cuatro rutas de ingesta (HTTP, CSV, vCard, proveedor) las obtengan
 * gratis al construir el value object.
 */
export class EmailAddress {
  private constructor(
    public readonly value: string,
    public readonly localPart: string,
    public readonly domain: string,
    public readonly emailLocalKey: string,
    public readonly emailDomainKey: string,
  ) {}

  static create(raw: string): Result<EmailAddress, ValidationError> {
    const trimmed = toNFKC(raw.trim()).toLowerCase();

    if (trimmed.length === 0) {
      return err(validationError("email_empty", "El correo no puede estar vacío.", "email"));
    }
    if (trimmed.length > MAX_TOTAL_LENGTH) {
      return err(validationError("email_too_long", "El correo excede la longitud máxima.", "email"));
    }
    if (!EMAIL_SHAPE.test(trimmed)) {
      return err(validationError("email_invalid_shape", "El correo no tiene un formato válido.", "email"));
    }

    const atIndex = trimmed.lastIndexOf("@");
    const localPart = trimmed.slice(0, atIndex);
    const domain = trimmed.slice(atIndex + 1);

    if (localPart.length === 0 || localPart.length > MAX_LOCAL_PART_LENGTH) {
      return err(validationError("email_invalid_local_part", "La parte local del correo es inválida.", "email"));
    }
    if (!LOCAL_PART_ALLOWED.test(localPart) || localPart.includes("..")) {
      return err(validationError("email_invalid_local_part", "La parte local del correo contiene caracteres no válidos.", "email"));
    }

    const domainLabels = domain.split(".");
    if (domainLabels.length < 2 || domainLabels.some((label) => !DOMAIN_LABEL.test(label))) {
      return err(validationError("email_invalid_domain", "El dominio del correo es inválido.", "email"));
    }

    const emailLocalKey = normalizeLocalKeyForDomain(localPart, domain);
    const emailDomainKey = getRegistrableDomain(domain);

    return ok(new EmailAddress(trimmed, localPart, domain, emailLocalKey, emailDomainKey));
  }

  /**
   * Reconstrucción de confianza para infraestructura (Fase 3): rehidrata un
   * `EmailAddress` desde datos ya validados y persistidos, sin re-ejecutar
   * las reglas de fábrica. Nunca debe usarse con datos de origen externo —
   * esa ruta es siempre `create`.
   */
  static restore(params: {
    readonly value: string;
    readonly localPart: string;
    readonly domain: string;
    readonly emailLocalKey: string;
    readonly emailDomainKey: string;
  }): EmailAddress {
    return new EmailAddress(params.value, params.localPart, params.domain, params.emailLocalKey, params.emailDomainKey);
  }
}

/**
 * Normalización conservadora de la parte local para B4 (ADR-18a): recorte y
 * minúsculas siempre (ya aplicados aguas arriba); supresión de `+etiqueta` y
 * de puntos solo en proveedores donde esa equivalencia está documentada.
 * Nunca universal: en muchos dominios corporativos `j.perez` y `jperez` son
 * dos personas distintas.
 */
function normalizeLocalKeyForDomain(localPart: string, domain: string): string {
  let key = localPart;
  if (PLUS_SUBADDRESSING_DOMAINS.has(domain)) {
    const plusIndex = key.indexOf("+");
    if (plusIndex >= 0) {
      key = key.slice(0, plusIndex);
    }
  }
  if (DOT_INSENSITIVE_LOCAL_PART_DOMAINS.has(domain)) {
    key = key.replace(/\./g, "");
  }
  return key;
}
