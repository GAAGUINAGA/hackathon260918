/**
 * Reserva arquitectónica (ADR-20). Declarado desde ya, sin adaptador ni
 * invocación hasta la Fase 7. `duplicate_candidates.blocking_key` admite
 * `'embedding'` en su `CHECK` (reserva de migración) pero ninguna clave de
 * bloqueo de esta versión lo emite (UC-03).
 */
export interface EmbeddingPort {
  embed(text: string): Promise<readonly number[]>;
}
