import type {
  ContactProviderPort,
  PushUpdateResult,
  RemoteContactDTO,
  RemoteContactPage,
} from "@ssot/application";

/**
 * Adaptador de Google People API (UC-05/UC-06, ADR-17). Declarado en Fase 2
 * como puerto, implementado aquí en Fase 3. El cliente HTTP se inyecta
 * (`fetchFn`) para poder probar el mapeo de peticiones/respuestas sin red
 * ni credenciales reales — la vinculación OAuth real (UC-09) vive en la
 * capa de interfaz (Fase 4) y solo entrega el `accessToken` vigente.
 *
 * Frontera de ADR-17: no existen métodos de creación ni eliminación
 * remota. `pushUpdate` es siempre un PATCH acotado a los campos
 * modificados localmente.
 */

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const PEOPLE_API_BASE = "https://people.googleapis.com/v1";
const PEOPLE_API_ORIGIN = "https://people.googleapis.com";
const PERSON_FIELDS = "names,emailAddresses,phoneNumbers,metadata";
const PAGE_SIZE = 200;
const GOOGLE_RESOURCE_NAME = /^people\/[A-Za-z0-9_-]+$/;

export class GoogleSyncTokenExpiredError extends Error {
  constructor() {
    super("El syncToken expiró (HTTP 410): reencolar como sync.full.");
    this.name = "GoogleSyncTokenExpiredError";
  }
}

export class GoogleRateLimitedError extends Error {
  constructor(public readonly retryAfterSeconds: number | null) {
    super("Google People API devolvió 429 (límite de tasa).");
    this.name = "GoogleRateLimitedError";
  }
}

export class GoogleContactNotFoundError extends Error {
  constructor(remoteId: string) {
    super(`El contacto remoto ${remoteId} ya no existe en el proveedor (HTTP 404).`);
    this.name = "GoogleContactNotFoundError";
  }
}

export class GoogleWriteConflictError extends Error {
  constructor() {
    super("El etag remoto no coincide (HTTP 4xx de precondición): alguien más modificó el contacto.");
    this.name = "GoogleWriteConflictError";
  }
}

/** RT-07 / modelo de amenazas F6: el identificador remoto no puede elegir el host de una petición. */
export class InvalidGoogleResourceNameError extends Error {
  constructor() {
    super("El identificador remoto de Google tiene un formato no permitido.");
    this.name = "InvalidGoogleResourceNameError";
  }
}

interface GooglePersonResource {
  readonly resourceName: string;
  readonly etag: string;
  readonly names?: ReadonlyArray<{ displayName?: string }>;
  readonly emailAddresses?: ReadonlyArray<{ value?: string }>;
  readonly phoneNumbers?: ReadonlyArray<{ value?: string }>;
  readonly metadata?: { readonly deleted?: boolean };
}

interface GoogleConnectionsListResponse {
  readonly connections?: readonly GooglePersonResource[];
  readonly nextPageToken?: string;
  readonly nextSyncToken?: string;
}

export class GooglePeopleAdapter implements ContactProviderPort {
  constructor(
    private readonly getAccessToken: (accountId: string) => Promise<string>,
    private readonly fetchFn: FetchLike = fetch,
  ) {}

  async fetchIncoming(accountId: string, syncToken: string | null, pageToken: string | null): Promise<RemoteContactPage> {
    const accessToken = await this.getAccessToken(accountId);
    const url = new URL(`${PEOPLE_API_BASE}/people/me/connections`);
    url.searchParams.set("personFields", PERSON_FIELDS);
    url.searchParams.set("pageSize", String(PAGE_SIZE));
    url.searchParams.set("requestSyncToken", "true");
    if (syncToken !== null) {
      url.searchParams.set("syncToken", syncToken);
    }
    if (pageToken !== null) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await this.fetchFn(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 410) {
      throw new GoogleSyncTokenExpiredError();
    }
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw new GoogleRateLimitedError(retryAfter !== null ? Number(retryAfter) : null);
    }
    if (!response.ok) {
      throw new Error(`Google People API respondió ${response.status} al listar conexiones.`);
    }

    const body = (await response.json()) as GoogleConnectionsListResponse;
    return {
      contacts: (body.connections ?? []).map(toRemoteContactDto),
      nextPageToken: body.nextPageToken ?? null,
      syncToken: body.nextSyncToken ?? null,
    };
  }

  async pushUpdate(
    accountId: string,
    remoteId: string,
    baseEtag: string,
    changedFields: Readonly<Record<string, unknown>>,
  ): Promise<PushUpdateResult> {
    const accessToken = await this.getAccessToken(accountId);
    if (!GOOGLE_RESOURCE_NAME.test(remoteId)) {
      throw new InvalidGoogleResourceNameError();
    }
    const updateMask = Object.keys(changedFields).join(",");
    const url = new URL(`${PEOPLE_API_BASE}/${remoteId}:updateContact`);
    if (url.origin !== PEOPLE_API_ORIGIN) {
      throw new InvalidGoogleResourceNameError();
    }
    url.searchParams.set("updatePersonFields", updateMask);

    const response = await this.fetchFn(url.toString(), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ etag: baseEtag, ...changedFields }),
    });

    if (response.status === 404) {
      throw new GoogleContactNotFoundError(remoteId);
    }
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw new GoogleRateLimitedError(retryAfter !== null ? Number(retryAfter) : null);
    }
    if (response.status === 400 || response.status === 409 || response.status === 412) {
      throw new GoogleWriteConflictError();
    }
    if (!response.ok) {
      throw new Error(`Google People API respondió ${response.status} al actualizar ${remoteId}.`);
    }

    const body = (await response.json()) as GooglePersonResource;
    return { etag: body.etag };
  }
}

function toRemoteContactDto(person: GooglePersonResource): RemoteContactDTO {
  return {
    remoteId: person.resourceName,
    etag: person.etag,
    displayName: person.names?.[0]?.displayName ?? null,
    emails: (person.emailAddresses ?? []).map((e) => e.value).filter((v): v is string => v !== undefined),
    phones: (person.phoneNumbers ?? []).map((p) => p.value).filter((v): v is string => v !== undefined),
    deletedRemotely: person.metadata?.deleted ?? false,
  };
}
