/**
 * Reserva arquitectónica (ADR-20). Declarado desde ya para que un puerto
 * añadido después no obligue a reescribir los casos de uso que lo
 * consumirían; SIN adaptador ni invocación hasta la Fase 7. Ningún caso de
 * uso de F1-F6 lo importa.
 */
export interface LlmCompletionRequest {
  readonly promptVersion: string;
  readonly input: Readonly<Record<string, unknown>>;
}

export interface LlmCompletionResult {
  readonly output: unknown;
  readonly model: string;
}

export interface LlmPort {
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResult>;
}
