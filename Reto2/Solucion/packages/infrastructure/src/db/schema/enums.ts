import { pgEnum } from "drizzle-orm/pg-core";

/** `actor_kind` incluye `'ai'` desde la primera migración (ADR-20, reserva). */
export const actorKindEnum = pgEnum("actor_kind", ["user", "system", "ai"]);

export const contactStatusEnum = pgEnum("contact_status", ["active", "merged"]);

export const candidateStatusEnum = pgEnum("candidate_status", [
  "pending",
  "merged",
  "rejected",
  "auto_merged",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "running",
  "completed",
  "partial",
  "failed",
]);

export const jobTypeEnum = pgEnum("job_type", [
  "sync_full",
  "sync_incremental",
  "import",
  "export",
  "dedupe_scan",
]);

export const pushStateEnum = pgEnum("push_state", ["pending", "synced", "conflict", "failed"]);

export const integrationStatusEnum = pgEnum("integration_status", ["active", "expired", "revoked"]);

export const integrationProviderEnum = pgEnum("integration_provider", ["google", "microsoft", "icloud"]);

/** Admite `'off'` (única en uso hasta F7) más los niveles reservados del modo IA (ADR-20). */
export const aiModeEnum = pgEnum("ai_mode", ["off", "suggest", "auto"]);

/** Admite `'embedding'` por reserva de migración; ninguna clave de bloqueo de F1-F6 lo emite (UC-03, ADR-20). */
export const blockingKeyEnum = pgEnum("blocking_key", ["B1", "B2", "B3", "B4", "embedding"]);

/** RT-10: coincide con `ContactMutationOperation` de `@ssot/application`. */
export const revisionOperationEnum = pgEnum("revision_operation", [
  "create",
  "update",
  "withdraw",
  "restore",
  "restore_revision",
  "merge",
]);

/** Coincide con `OutboxEventType` de `@ssot/application`. */
export const outboxEventTypeEnum = pgEnum("outbox_event_type", [
  "dedupe:scan",
  "merge:auto",
  "push.external",
  "push.groups",
  "sync.full",
  "import:file",
  "export:file",
]);
