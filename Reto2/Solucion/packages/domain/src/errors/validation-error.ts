/**
 * Error de dominio para fabricas que devuelven Result<T, ValidationError>
 * (ADR-10). Nunca se lanza como excepcion: se propaga como valor.
 */
export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
}

export function validationError(
  code: string,
  message: string,
  field?: string,
): ValidationError {
  return field === undefined ? { code, message } : { code, message, field };
}
