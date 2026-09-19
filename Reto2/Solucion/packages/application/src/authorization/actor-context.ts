/**
 * RT-01 (alcance por propietario). El `ownerId` de todo caso de uso y de todo
 * puerto se resuelve exclusivamente de `ActorContext`, nunca de un parámetro
 * suelto que un llamador pudiera fijar arbitrariamente. `ActorContext` lo
 * construye la interfaz (Anillo 3, Fase 4) a partir del JWT verificado
 * (claim `sub`) — la aplicación solo lo consume.
 *
 * `actorKind` incluye `'ai'` desde ya (reserva arquitectónica, ADR-20):
 * ningún caso de uso de esta fase lo emite ni lo consume.
 */
export type ActorKind = "user" | "system" | "ai";

export interface ActorContext {
  readonly ownerId: string;
  readonly actorKind: ActorKind;
}

export function createActorContext(ownerId: string, actorKind: ActorKind = "user"): ActorContext {
  return { ownerId, actorKind };
}
