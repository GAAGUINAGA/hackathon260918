import type { ActorContext } from "../authorization/actor-context.js";

/**
 * Puerto del Outbox transaccional (RT-04). La aplicación solo declara la
 * intención de emitir un evento; el adaptador real (Fase 3) garantiza que
 * la inserción viaja en la misma transacción de Drizzle que la mutación de
 * datos. La aplicación no sabe nada de transacciones ni de la tabla
 * `outbox` — ese acoplamiento viviría en infraestructura, no aquí.
 */
export type OutboxEventType =
  | "dedupe:scan"
  | "merge:auto"
  | "push.external"
  | "push.groups"
  | "sync.full"
  | "import:file"
  | "export:file";

export interface OutboxEvent<TPayload = Readonly<Record<string, unknown>>> {
  readonly type: OutboxEventType;
  readonly payload: TPayload;
}

export interface OutboxPort {
  enqueue(actor: ActorContext, event: OutboxEvent): Promise<void>;
}
