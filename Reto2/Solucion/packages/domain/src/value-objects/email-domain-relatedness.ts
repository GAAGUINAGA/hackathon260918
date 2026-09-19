/**
 * Dominio emparentado (ADR-18a, UC-03 señal B4). Implementación pura y
 * determinista: sin acceso a red ni a la tabla de alias real (esa vive en
 * infraestructura/Fase 3). La tabla de alias se recibe por parámetro como
 * dato ya resuelto, para que este módulo siga siendo puro y testeable sin
 * base de datos.
 */

// Sufijos públicos multi-etiqueta conocidos. Lista curada, no exhaustiva
// (no sustituye una Public Suffix List completa): cubre los casos más
// comunes para que `getRegistrableDomain` no colapse "puce.edu.ec" en
// "edu.ec". Ampliable sin romper el contrato de la función.
const MULTI_LABEL_PUBLIC_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "com.au",
  "com.br",
  "com.mx",
  "com.ar",
  "com.co",
  "com.ec",
  "edu.ec",
  "gob.ec",
  "org.ec",
  "net.ec",
  "fin.ec",
  "co.jp",
  "co.in",
  "com.cn",
  "com.pe",
  "com.uy",
  "com.ve",
]);

// Proveedores de correo masivo excluidos de B4 (ADR-18a): compartir
// "gmail.com" no emparenta nada.
const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "protonmail.com",
  "gmx.com",
  "mail.com",
  "yandex.com",
  "zoho.com",
]);

export function isFreeEmailProvider(domain: string): boolean {
  return FREE_EMAIL_PROVIDERS.has(domain.toLowerCase());
}

/** Dominio registrable base (aproximación de eTLD+1). */
export function getRegistrableDomain(domain: string): string {
  const labels = domain.toLowerCase().split(".");
  if (labels.length <= 2) {
    return domain.toLowerCase();
  }
  const lastTwo = labels.slice(-2).join(".");
  if (MULTI_LABEL_PUBLIC_SUFFIXES.has(lastTwo) && labels.length >= 3) {
    return labels.slice(-3).join(".");
  }
  return lastTwo;
}

function isSubdomainOf(candidate: string, base: string): boolean {
  return candidate !== base && candidate.endsWith(`.${base}`);
}

/** Clave canónica no ordenada para una tabla de alias (par de dominios). */
export function canonicalDomainPairKey(domainA: string, domainB: string): string {
  const [first, second] = [domainA.toLowerCase(), domainB.toLowerCase()].sort();
  return `${first}|${second}`;
}

/**
 * Dos dominios están emparentados si comparten dominio registrable base, si
 * uno es subdominio del otro, o si el par figura en la tabla de alias
 * (ADR-18a). Los proveedores de correo masivo quedan excluidos.
 */
export function areDomainsRelated(
  domainA: string,
  domainB: string,
  knownAliasPairs: ReadonlySet<string> = new Set(),
): boolean {
  const a = domainA.toLowerCase();
  const b = domainB.toLowerCase();

  if (isFreeEmailProvider(a) || isFreeEmailProvider(b)) {
    return false;
  }
  if (a === b) {
    return true;
  }
  if (getRegistrableDomain(a) === getRegistrableDomain(b)) {
    return true;
  }
  if (isSubdomainOf(a, b) || isSubdomainOf(b, a)) {
    return true;
  }
  return knownAliasPairs.has(canonicalDomainPairKey(a, b));
}
