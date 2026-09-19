/**
 * Anillo 3 - Worker BullMQ (NestJS standalone) + rele transaccional del
 * Outbox (LISTEN/NOTIFY + sondeo adaptativo, RT-04). Se implementa en Fase 4.
 *
 * No inicia hasta que los anillos 0-2 esten cerrados, probados y auditados.
 */
export const RING = "A3-worker" as const;
