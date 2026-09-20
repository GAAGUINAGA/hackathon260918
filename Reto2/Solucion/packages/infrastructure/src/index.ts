/**
 * Anillo 2 (Infraestructura). Implementa los puertos de @ssot/application
 * contra Postgres/Drizzle, cripto y adaptadores externos.
 */
export type { Database } from "./db/connection.js";
export { createDb, createPool } from "./db/connection.js";
export type { WithOwnerTransactionOptions } from "./db/transaction.js";
export { withOwnerTransaction } from "./db/transaction.js";
export * as schema from "./db/schema/index.js";

export { withTransactionalContactWrites } from "./transactional-contact-writes.js";

export { DrizzleContactRepository } from "./repositories/drizzle-contact-repository.js";
export { DrizzleContactQuery } from "./queries/drizzle-contact-query.js";
export { DrizzleOutbox } from "./outbox/drizzle-outbox.js";
export type { OutboxEventHandler, OutboxRelayEvent, OutboxRelayOptions } from "./outbox/relay.js";
export { OutboxRelay } from "./outbox/relay.js";

export type { FetchLike } from "./adapters/google/google-people-adapter.js";
export {
  GoogleContactNotFoundError,
  GooglePeopleAdapter,
  GoogleRateLimitedError,
  GoogleSyncTokenExpiredError,
  GoogleWriteConflictError,
} from "./adapters/google/google-people-adapter.js";

export type { EncryptedToken } from "./crypto/token-cipher.js";
export {
  decryptToken,
  encryptToken,
  InvalidEncryptionKeyError,
  parseEncryptionKey,
  TokenDecryptionError,
} from "./crypto/token-cipher.js";
