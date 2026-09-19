import type { EmailAddress } from "../value-objects/email-address.js";
import { areDomainsRelated } from "../value-objects/email-domain-relatedness.js";
import type { PhoneNumber } from "../value-objects/phone-number.js";
import { normalizeForComparison, trigramSimilarity } from "../shared/text-normalization.js";

/**
 * Etapa 1 de UC-03 (bloqueo): predicados deterministas que generan pares
 * candidatos. En producción, B1-B3 corren como consultas indexadas en
 * infraestructura (Postgres); estas funciones puras son la especificación
 * ejecutable de esa lógica y lo que se usa aquí para puntuar (Etapa 2).
 */

/** B1 — correo normalizado idéntico. */
export function isSameNormalizedEmail(a?: EmailAddress, b?: EmailAddress): boolean {
  return a !== undefined && b !== undefined && a.value === b.value;
}

/** B2 — teléfono E.164 idéntico. Los teléfonos `unnormalized` no participan. */
export function isSameE164Phone(a?: PhoneNumber, b?: PhoneNumber): boolean {
  return a !== undefined && b !== undefined && a.isNormalized && b.isNormalized && a.e164 === b.e164;
}

const DEFAULT_NAME_BLOCKING_THRESHOLD = 0.3;

/** B3 — similitud trigram alta sobre nombre normalizado. */
export function isNameSimilarityAboveThreshold(
  nameA?: string,
  nameB?: string,
  threshold: number = DEFAULT_NAME_BLOCKING_THRESHOLD,
): boolean {
  if (nameA === undefined || nameB === undefined) {
    return false;
  }
  const similarity = trigramSimilarity(normalizeForComparison(nameA), normalizeForComparison(nameB));
  return similarity >= threshold;
}

/** B4 — misma parte local + dominio emparentado (ADR-18a). */
export function isRelatedEmailDomainSameLocal(
  a?: EmailAddress,
  b?: EmailAddress,
  knownAliasPairs?: ReadonlySet<string>,
): boolean {
  if (a === undefined || b === undefined) {
    return false;
  }
  if (a.domain === b.domain) {
    // Mismo dominio exacto: no es la señal B4 (que exige dominios
    // *distintos* pero emparentados); B1 ya cubre la identidad exacta.
    return false;
  }
  return a.emailLocalKey === b.emailLocalKey && areDomainsRelated(a.domain, b.domain, knownAliasPairs);
}
