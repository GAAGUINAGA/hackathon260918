import type { EmailAddress } from "../value-objects/email-address.js";
import type { PhoneNumber } from "../value-objects/phone-number.js";
import { normalizeForComparison, trigramSimilarity } from "../shared/text-normalization.js";
import { isRelatedEmailDomainSameLocal, isSameE164Phone, isSameNormalizedEmail } from "./blocking.js";

/**
 * Etapa 2 de UC-03: puntuación determinista y explicable. Cada señal que
 * contribuye queda registrada con su peso, para que la decisión sea
 * auditable (planeacion_v.2.1.2 §Principios rectores).
 */

export interface DedupMatchCandidate {
  readonly emailAddress?: EmailAddress;
  readonly phoneNumber?: PhoneNumber;
  readonly displayName?: string;
  readonly company?: string;
  readonly title?: string;
  readonly integrationAccountId?: string;
}

export interface DedupSignal {
  readonly code: string;
  readonly weight: number;
  readonly description: string;
}

export type DedupDecision = "auto_merged" | "pending" | "discarded";

export interface DedupScoreResult {
  readonly score: number;
  readonly signals: readonly DedupSignal[];
  readonly hasStrongIdentifierMatch: boolean;
  readonly decision: DedupDecision;
}

const WEIGHT_SAME_EMAIL = 0.55;
const WEIGHT_SAME_PHONE = 0.45;
const WEIGHT_RELATED_DOMAIN_SAME_LOCAL = 0.35;
const WEIGHT_NAME_SIMILARITY_MAX = 0.25;
const WEIGHT_COMPANY_AND_TITLE_MATCH = 0.1;
const PENALTY_SAME_INTEGRATION_ACCOUNT = -0.3;

const AUTO_MERGE_THRESHOLD = 0.9;
const PENDING_THRESHOLD = 0.55;

/**
 * Puntúa un par candidato ya generado por la Etapa 1 (bloqueo). No asume
 * cadenas transitivas: cada par se evalúa de forma independiente (UC-03,
 * flujo alterno 4a).
 */
export function scoreDedupCandidate(
  a: DedupMatchCandidate,
  b: DedupMatchCandidate,
  knownEmailDomainAliasPairs?: ReadonlySet<string>,
): DedupScoreResult {
  const signals: DedupSignal[] = [];
  let hasStrongIdentifierMatch = false;

  if (isSameNormalizedEmail(a.emailAddress, b.emailAddress)) {
    signals.push({
      code: "same_normalized_email",
      weight: WEIGHT_SAME_EMAIL,
      description: "Correo normalizado idéntico.",
    });
    hasStrongIdentifierMatch = true;
  }

  if (isSameE164Phone(a.phoneNumber, b.phoneNumber)) {
    signals.push({
      code: "same_e164_phone",
      weight: WEIGHT_SAME_PHONE,
      description: "Teléfono E.164 idéntico.",
    });
    hasStrongIdentifierMatch = true;
  }

  if (isRelatedEmailDomainSameLocal(a.emailAddress, b.emailAddress, knownEmailDomainAliasPairs)) {
    signals.push({
      code: "related_email_domain_same_local",
      weight: WEIGHT_RELATED_DOMAIN_SAME_LOCAL,
      description: "Misma parte local con dominio emparentado (ADR-18a, B4). No cuenta como identificador fuerte.",
    });
  }

  if (a.displayName !== undefined && b.displayName !== undefined) {
    const similarity = trigramSimilarity(
      normalizeForComparison(a.displayName),
      normalizeForComparison(b.displayName),
    );
    if (similarity > 0) {
      signals.push({
        code: "name_similarity",
        weight: similarity * WEIGHT_NAME_SIMILARITY_MAX,
        description: `Similitud de nombre (trigram): ${(similarity * 100).toFixed(0)}%.`,
      });
    }
  }

  if (
    a.company !== undefined &&
    b.company !== undefined &&
    a.title !== undefined &&
    b.title !== undefined &&
    normalizeForComparison(a.company) === normalizeForComparison(b.company) &&
    normalizeForComparison(a.title) === normalizeForComparison(b.title)
  ) {
    signals.push({
      code: "company_and_title_match",
      weight: WEIGHT_COMPANY_AND_TITLE_MATCH,
      description: "Empresa y cargo coincidentes.",
    });
  }

  if (
    a.integrationAccountId !== undefined &&
    b.integrationAccountId !== undefined &&
    a.integrationAccountId === b.integrationAccountId
  ) {
    signals.push({
      code: "same_integration_account",
      weight: PENALTY_SAME_INTEGRATION_ACCOUNT,
      description: "Ambos contactos provienen de la misma cuenta del mismo proveedor.",
    });
  }

  const rawSum = signals.reduce((total, signal) => total + signal.weight, 0);
  const score = Math.min(1, Math.max(0, rawSum));

  const decision = decide(score, hasStrongIdentifierMatch);

  return { score, signals, hasStrongIdentifierMatch, decision };
}

function decide(score: number, hasStrongIdentifierMatch: boolean): DedupDecision {
  if (score >= AUTO_MERGE_THRESHOLD && hasStrongIdentifierMatch) {
    return "auto_merged";
  }
  if (score >= PENDING_THRESHOLD) {
    return "pending";
  }
  return "discarded";
}
