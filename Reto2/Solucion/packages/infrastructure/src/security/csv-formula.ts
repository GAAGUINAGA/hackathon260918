/**
 * UC-07 flujo 4b y UC-18 flujo 3: evita que una celda controlada por datos
 * importados o almacenados se evalúe como fórmula al abrir un CSV.
 * Debe aplicarse en la entrada CSV y nuevamente al serializar una exportación;
 * esos casos de uso aún no están implementados en esta fase.
 */
export function neutralizeCsvFormula(value: string): string {
  return /^[\s]*[=+\-@]/u.test(value) ? `'${value}` : value;
}
