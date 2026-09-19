/**
 * Tabla de códigos de llamada (indicativo internacional) por región
 * ISO 3166-1 alpha-2. Lista curada, no exhaustiva: cubre las regiones más
 * comunes para normalización a E.164 (UC-01, planeacion_v.2.1.2 Fase 1).
 * Una región ausente de esta tabla no es un error: el teléfono se conserva
 * `unnormalized` (UC-01, flujo 3c) en lugar de rechazarse.
 */
export const CALLING_CODES: ReadonlyMap<string, string> = new Map([
  ["EC", "593"],
  ["US", "1"],
  ["CA", "1"],
  ["MX", "52"],
  ["CO", "57"],
  ["PE", "51"],
  ["CL", "56"],
  ["AR", "54"],
  ["BR", "55"],
  ["UY", "598"],
  ["PY", "595"],
  ["BO", "591"],
  ["VE", "58"],
  ["PA", "507"],
  ["CR", "506"],
  ["GT", "502"],
  ["HN", "504"],
  ["SV", "503"],
  ["NI", "505"],
  ["DO", "1"],
  ["ES", "34"],
  ["GB", "44"],
  ["FR", "33"],
  ["DE", "49"],
  ["IT", "39"],
  ["PT", "351"],
  ["NL", "31"],
  ["BE", "32"],
  ["CH", "41"],
  ["IE", "353"],
  ["SE", "46"],
  ["NO", "47"],
  ["DK", "45"],
  ["FI", "358"],
  ["PL", "48"],
  ["AU", "61"],
  ["NZ", "64"],
  ["JP", "81"],
  ["CN", "86"],
  ["KR", "82"],
  ["IN", "91"],
  ["ZA", "27"],
]);

export function getCallingCode(region: string): string | undefined {
  return CALLING_CODES.get(region.toUpperCase());
}
