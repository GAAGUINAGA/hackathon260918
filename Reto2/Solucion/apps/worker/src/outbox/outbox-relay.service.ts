import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { OutboxRelay, type OutboxRelayEvent } from "@ssot/infrastructure";
import type { Pool } from "pg";

/**
 * Arranca el relé del Outbox (RT-04 §4.2) como parte del ciclo de vida de
 * Nest. El `handler` es el único punto que crecerá cuando UC-05/06/07
 * tengan casos de uso reales que consumir `dedupe:scan`, `push.external`,
 * etc. — hoy solo registra el evento reclamado, sin inventar lógica de
 * negocio que ninguna fase anterior definió (no adelantar F5+ trabajo real
 * de sincronización).
 */
@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private readonly relay: OutboxRelay;

  constructor(relayPool: Pool) {
    this.relay = new OutboxRelay(relayPool, (event) => this.handle(event));
  }

  async onModuleInit(): Promise<void> {
    await this.relay.start();
    this.logger.log("OutboxRelay iniciado (LISTEN outbox_channel + sondeo adaptativo).");
  }

  onModuleDestroy(): void {
    this.relay.stop();
  }

  private async handle(event: OutboxRelayEvent): Promise<void> {
    this.logger.log(`outbox event id=${event.id} type=${event.eventType} owner=${event.ownerId}`);
    // RT-05/RT-06: el despacho a un consumidor idempotente y con reintentos
    // llega junto con los casos de uso de F5+ que lo necesiten.
    await Promise.resolve();
  }
}
