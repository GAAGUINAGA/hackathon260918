import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { integrationProviderEnum, integrationStatusEnum } from "./enums.js";
import { ownerIdColumn, stateColumn, timestamps, uuidPk } from "./_shared.js";

/**
 * UC-09/UC-10. El `refresh_token` se cifra con AES-256-GCM (RT-08); el
 * texto en claro nunca se persiste ni se expone por API. Al revocar, el
 * ciphertext se sobrescribe físicamente (excepción acotada de RT-08) y la
 * fila se retira (`state = false`), conservando su historial de vinculación.
 */
export const integrationAccounts = pgTable(
  "integration_accounts",
  {
    id: uuidPk(),
    ownerId: ownerIdColumn(),
    provider: integrationProviderEnum("provider").notNull(),
    remoteAccountId: text("remote_account_id").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    status: integrationStatusEnum("status").notNull().default("active"),
    // AES-256-GCM (RT-08): IV y auth tag nunca se reutilizan entre filas.
    refreshTokenCiphertext: text("refresh_token_ciphertext").notNull(),
    refreshTokenIv: text("refresh_token_iv").notNull(),
    refreshTokenAuthTag: text("refresh_token_auth_tag").notNull(),
    syncToken: text("sync_token"),
    state: stateColumn(),
    ...timestamps(),
  },
  (table) => [
    // RT-16 (UC-09, flujo 5b): revincular una cuenta retirada no colisiona.
    uniqueIndex("integration_accounts_live_idx")
      .on(table.ownerId, table.provider, table.remoteAccountId)
      .where(sql`${table.state} = true`),
  ],
);
