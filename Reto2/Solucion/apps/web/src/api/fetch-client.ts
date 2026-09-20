import { getAccessToken } from "../auth/session.js";
import { loadWebEnv } from "../lib/env.js";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseBody<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return undefined as T;
}

/**
 * Mutador de orval (ADR-08): el cliente generado en `src/api/generated`
 * llama a esta función para cada operación. Adjunta el JWT de la sesión
 * de Supabase (ADR-05, RT-01: el backend deriva `owner_id` solo de ese
 * token) y traduce errores HTTP no-2xx a `ApiError`.
 */
export async function ssotFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body !== undefined && options.body !== null && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token !== null) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const { apiBaseUrl } = loadWebEnv();
  const response = await fetch(`${apiBaseUrl}${url}`, { ...options, headers });

  if (!response.ok) {
    const body = await parseBody<{ code?: string; message?: string; field?: string }>(response).catch(
      () => undefined,
    );
    throw new ApiError(response.status, body?.code, body?.message ?? `Error HTTP ${response.status}`, body?.field);
  }

  return parseBody<T>(response);
}
