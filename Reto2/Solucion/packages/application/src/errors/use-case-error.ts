/**
 * Error de aplicación para casos de uso que devuelven
 * `Result<T, UseCaseError>`. Distinto de `ValidationError` de dominio:
 * cubre fallos de orquestación (autorización, no encontrado, conflicto),
 * no invariantes de negocio puras.
 */
export type UseCaseErrorCode = "unauthorized" | "not_found" | "conflict" | "invalid_input";

export interface UseCaseError {
  readonly code: UseCaseErrorCode;
  readonly message: string;
}

export function useCaseError(code: UseCaseErrorCode, message: string): UseCaseError {
  return { code, message };
}
