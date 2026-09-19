/**
 * Normalizaciones puras de texto (planeacion_v.2.1.2 Fase 1: NFKC, unaccent).
 * Sin dependencias externas: usa solo Unicode Normalization Forms nativos
 * de JavaScript.
 */

/** Forma de compatibilidad canónica (equipara anchos, ligaduras, etc.). */
export function toNFKC(input: string): string {
  return input.normalize("NFKC");
}

const COMBINING_DIACRITICAL_MARKS = /[̀-ͯ]/g;

/**
 * Aproxima el comportamiento de la extensión `unaccent` de PostgreSQL:
 * descompone en forma NFKD y elimina las marcas diacríticas combinantes.
 * "José" -> "Jose".
 */
export function stripDiacritics(input: string): string {
  return input.normalize("NFKD").replace(COMBINING_DIACRITICAL_MARKS, "");
}

/**
 * Clave de comparación determinista para nombres y textos libres:
 * recorte, NFKC, sin diacríticos, minúsculas y espacios colapsados.
 */
export function normalizeForComparison(input: string): string {
  return stripDiacritics(toNFKC(input.trim()))
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function trigrams(value: string): Set<string> {
  const padded = `  ${value}  `;
  const result = new Set<string>();
  for (let i = 0; i < padded.length - 2; i += 1) {
    result.add(padded.slice(i, i + 3));
  }
  return result;
}

/**
 * Similitud trigram (coeficiente de Dice) entre dos cadenas ya normalizadas.
 * Aproximación pura y determinista de `pg_trgm`, usada por el motor de
 * puntuación de deduplicación (UC-03, señal B3). Devuelve un valor en [0,1].
 */
export function trigramSimilarity(a: string, b: string): number {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }
  if (a === b) {
    return 1;
  }
  const trigramsA = trigrams(a);
  const trigramsB = trigrams(b);
  let shared = 0;
  for (const trigram of trigramsA) {
    if (trigramsB.has(trigram)) {
      shared += 1;
    }
  }
  return (2 * shared) / (trigramsA.size + trigramsB.size);
}
