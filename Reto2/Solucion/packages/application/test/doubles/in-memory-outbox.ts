import type { ActorContext } from "../../src/authorization/actor-context.js";
import type { OutboxEvent, OutboxPort } from "../../src/ports/outbox.port.js";

/** Doble de prueba en memoria del Outbox (CLAUDE.md, Fase 2). */
export class InMemoryOutbox implements OutboxPort {
  readonly events: Array<{ actor: ActorContext; event: OutboxEvent }> = [];

  async enqueue(actor: ActorContext, event: OutboxEvent): Promise<void> {
    this.events.push({ actor, event });
  }
}
