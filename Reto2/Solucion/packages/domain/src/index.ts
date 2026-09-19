/**
 * Anillo 0 (Dominio puro). Prohibido importar librerias de infraestructura,
 * HTTP, ORM o red (ADR-09, regla domain-is-pure). Unica dependencia externa
 * autorizada: neverthrow (ADR-10, Result<T,E>).
 */
export type { ValidationError } from "./errors/validation-error.js";
export { validationError } from "./errors/validation-error.js";

export {
  normalizeForComparison,
  stripDiacritics,
  toNFKC,
  trigramSimilarity,
} from "./shared/text-normalization.js";

export { EmailAddress } from "./value-objects/email-address.js";
export {
  areDomainsRelated,
  canonicalDomainPairKey,
  getRegistrableDomain,
  isFreeEmailProvider,
} from "./value-objects/email-domain-relatedness.js";
export { PhoneNumber } from "./value-objects/phone-number.js";
export { CALLING_CODES, getCallingCode } from "./value-objects/calling-codes.js";

export type {
  DedupDecision,
  DedupMatchCandidate,
  DedupScoreResult,
  DedupSignal,
} from "./dedup/scoring.js";
export { scoreDedupCandidate } from "./dedup/scoring.js";
export {
  isNameSimilarityAboveThreshold,
  isRelatedEmailDomainSameLocal,
  isSameE164Phone,
  isSameNormalizedEmail,
} from "./dedup/blocking.js";
