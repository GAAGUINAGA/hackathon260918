import type { Pool, PoolClient } from "pg";

/**
 * Relé híbrido del Outbox (RT-04 §4.2): notificación activa (`LISTEN`,
 * disparada por `notify_outbox()` en la migración 0001) + sondeo
 * adaptativo de respaldo. El payload de `NOTIFY` es solo una señal de
 * despertar — este módulo siempre relee la tabla, que es la fuente de
 * verdad. Se conecta como `app_relay` (no `app_rw`): un lote abarca muchos
 * propietarios a la vez, algo que la política de `app_rw` no permite ver.
 */

export interface OutboxRelayEvent {
  readonly id: number;
  readonly ownerId: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly createdAt: Date;
}

export interface OutboxRelayOptions {
  readonly batchSize?: number;
  readonly minPollIntervalMs?: number;
  readonly maxPollIntervalMs?: number;
}

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MIN_POLL_INTERVAL_MS = 200;
const DEFAULT_MAX_POLL_INTERVAL_MS = 30_000;

export type OutboxEventHandler = (event: OutboxRelayEvent) => Promise<void>;

export class OutboxRelay {
  private readonly batchSize: number;
  private readonly minPollIntervalMs: number;
  private readonly maxPollIntervalMs: number;
  private currentPollIntervalMs: number;
  private listenerClient: PoolClient | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private stopped = true;

  constructor(
    private readonly pool: Pool,
    private readonly handler: OutboxEventHandler,
    options: OutboxRelayOptions = {},
  ) {
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    this.minPollIntervalMs = options.minPollIntervalMs ?? DEFAULT_MIN_POLL_INTERVAL_MS;
    this.maxPollIntervalMs = options.maxPollIntervalMs ?? DEFAULT_MAX_POLL_INTERVAL_MS;
    this.currentPollIntervalMs = this.minPollIntervalMs;
  }

  /**
   * Reclama y procesa un lote. `FOR UPDATE SKIP LOCKED` permite varias
   * instancias del relé sin solaparse (§4.2). Marcar `processed_at` ocurre
   * en la MISMA transacción que el reclamo: si el proceso muere entre el
   * reclamo y el marcado, la fila queda sin marcar y otra instancia la
   * reclama después — entrega al menos una vez (RT-05 la hace idempotente).
   */
  async processBatch(): Promise<number> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<{
        id: string;
        owner_id: string;
        event_type: string;
        payload: Record<string, unknown>;
        created_at: Date;
      }>(
        `SELECT id, owner_id, event_type, payload, created_at
         FROM "outbox"
         WHERE processed_at IS NULL
         ORDER BY created_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [this.batchSize],
      );

      if (rows.length === 0) {
        await client.query("COMMIT");
        return 0;
      }

      const claimed: OutboxRelayEvent[] = rows.map((row) => ({
        id: Number(row.id),
        ownerId: row.owner_id,
        eventType: row.event_type,
        payload: row.payload,
        createdAt: row.created_at,
      }));

      for (const event of claimed) {
        await this.handler(event);
      }

      await client.query('UPDATE "outbox" SET processed_at = now() WHERE id = ANY($1::bigint[])', [
        claimed.map((event) => event.id),
      ]);
      await client.query("COMMIT");
      return claimed.length;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Sondeo adaptativo (§4.2): el intervalo se estrecha cuando hay trabajo
   * pendiente y se ensancha (duplicándose) hasta un techo cuando la tabla
   * está vacía, para no golpear la base en un bucle ajustado sin trabajo.
   */
  nextPollIntervalMs(itemsProcessedLastRun: number): number {
    if (itemsProcessedLastRun > 0) {
      return this.minPollIntervalMs;
    }
    return Math.min(this.currentPollIntervalMs * 2, this.maxPollIntervalMs);
  }

  async start(): Promise<void> {
    this.stopped = false;
    this.listenerClient = await this.pool.connect();
    await this.listenerClient.query("LISTEN outbox_channel");
    this.listenerClient.on("notification", () => {
      this.wake();
    });
    this.scheduleNextPoll();
  }

  stop(): void {
    this.stopped = true;
    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.listenerClient !== null) {
      this.listenerClient.release();
      this.listenerClient = null;
    }
  }

  private wake(): void {
    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer);
    }
    this.currentPollIntervalMs = this.minPollIntervalMs;
    this.pollTimer = setTimeout(() => void this.tick(), 0);
  }

  private scheduleNextPoll(): void {
    if (this.stopped) {
      return;
    }
    this.pollTimer = setTimeout(() => void this.tick(), this.currentPollIntervalMs);
  }

  private async tick(): Promise<void> {
    if (this.stopped) {
      return;
    }
    const processed = await this.processBatch();
    this.currentPollIntervalMs = this.nextPollIntervalMs(processed);
    this.scheduleNextPoll();
  }
}
