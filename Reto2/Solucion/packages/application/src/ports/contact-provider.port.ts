/**
 * Puerto de integración externa (ADR-01, ADR-17). Declarado en Fase 2;
 * implementado por el adaptador de Google People API en Fase 3 (UC-05/06).
 * La escritura saliente está acotada a actualización — no hay `create`
 * ni `delete` en esta interfaz (ADR-17: el sistema no crea ni elimina
 * contactos en el proveedor).
 */

export interface RemoteContactDTO {
  readonly remoteId: string;
  readonly etag: string;
  readonly displayName: string | null;
  readonly emails: readonly string[];
  readonly phones: readonly string[];
  readonly deletedRemotely: boolean;
}

export interface RemoteContactPage {
  readonly contacts: readonly RemoteContactDTO[];
  readonly nextPageToken: string | null;
  /** Presente solo en la última página; null mientras queden páginas. */
  readonly syncToken: string | null;
}

export interface PushUpdateResult {
  readonly etag: string;
}

export interface ContactProviderPort {
  /** UC-05: sincronización entrante completa (syncToken null) o incremental. */
  fetchIncoming(accountId: string, syncToken: string | null, pageToken: string | null): Promise<RemoteContactPage>;

  /** UC-06: escritura saliente acotada a los campos modificados localmente. */
  pushUpdate(
    accountId: string,
    remoteId: string,
    baseEtag: string,
    changedFields: Readonly<Record<string, unknown>>,
  ): Promise<PushUpdateResult>;
}
