import { describe, expect, it, vi } from "vitest";
import {
  GoogleContactNotFoundError,
  GooglePeopleAdapter,
  InvalidGoogleResourceNameError,
  GoogleRateLimitedError,
  GoogleSyncTokenExpiredError,
  GoogleWriteConflictError,
  type FetchLike,
} from "../../src/adapters/google/google-people-adapter.js";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

describe("GooglePeopleAdapter.fetchIncoming (UC-05)", () => {
  it("mapea la respuesta de Google al DTO canónico e incluye Authorization Bearer", async () => {
    const fetchFn = vi.fn<FetchLike>(async (url, init) => {
      expect(url).toContain("people.googleapis.com/v1/people/me/connections");
      expect(init?.headers).toMatchObject({ Authorization: "Bearer token-123" });
      return jsonResponse(200, {
        connections: [
          {
            resourceName: "people/c1",
            etag: "etag-1",
            names: [{ displayName: "Ana Pérez" }],
            emailAddresses: [{ value: "ana@empresa.com" }],
            phoneNumbers: [{ value: "+593991234567" }],
            metadata: { deleted: false },
          },
        ],
        nextPageToken: "page-2",
        nextSyncToken: undefined,
      });
    });

    const adapter = new GooglePeopleAdapter(async () => "token-123", fetchFn);
    const page = await adapter.fetchIncoming("acc-1", null, null);

    expect(page.contacts).toEqual([
      {
        remoteId: "people/c1",
        etag: "etag-1",
        displayName: "Ana Pérez",
        emails: ["ana@empresa.com"],
        phones: ["+593991234567"],
        deletedRemotely: false,
      },
    ]);
    expect(page.nextPageToken).toBe("page-2");
    expect(page.syncToken).toBeNull();
  });

  it("lanza GoogleSyncTokenExpiredError en HTTP 410 (UC-05, flujo 3a)", async () => {
    const fetchFn: FetchLike = async () => jsonResponse(410, {});
    const adapter = new GooglePeopleAdapter(async () => "token", fetchFn);
    await expect(adapter.fetchIncoming("acc-1", "stale-token", null)).rejects.toThrow(GoogleSyncTokenExpiredError);
  });

  it("lanza GoogleRateLimitedError en HTTP 429 con Retry-After (UC-05, flujo 3b)", async () => {
    const fetchFn: FetchLike = async () => jsonResponse(429, {}, { "Retry-After": "30" });
    const adapter = new GooglePeopleAdapter(async () => "token", fetchFn);
    await expect(adapter.fetchIncoming("acc-1", null, null)).rejects.toThrow(GoogleRateLimitedError);
  });

  it("incluye syncToken y pageToken en la URL cuando se proveen", async () => {
    const fetchFn = vi.fn<FetchLike>(async (url) => {
      expect(url).toContain("syncToken=abc");
      expect(url).toContain("pageToken=xyz");
      return jsonResponse(200, { connections: [] });
    });
    const adapter = new GooglePeopleAdapter(async () => "token", fetchFn);
    await adapter.fetchIncoming("acc-1", "abc", "xyz");
    expect(fetchFn).toHaveBeenCalledOnce();
  });
});

describe("GooglePeopleAdapter.pushUpdate (UC-06, ADR-17)", () => {
  it("envía PATCH acotado a los campos modificados con el etag base", async () => {
    const fetchFn = vi.fn<FetchLike>(async (url, init) => {
      expect(url).toContain(":updateContact");
      expect(url).toContain("updatePersonFields=names");
      expect(init?.method).toBe("PATCH");
      const sentBody = JSON.parse(init?.body as string) as Record<string, unknown>;
      expect(sentBody["etag"]).toBe("etag-base");
      return jsonResponse(200, { resourceName: "people/c1", etag: "etag-nuevo" });
    });

    const adapter = new GooglePeopleAdapter(async () => "token", fetchFn);
    const result = await adapter.pushUpdate("acc-1", "people/c1", "etag-base", { names: [{ displayName: "Nuevo" }] });

    expect(result.etag).toBe("etag-nuevo");
  });

  it("lanza GoogleContactNotFoundError en HTTP 404 (UC-06, flujo 3b: no se recrea)", async () => {
    const fetchFn: FetchLike = async () => jsonResponse(404, {});
    const adapter = new GooglePeopleAdapter(async () => "token", fetchFn);
    await expect(adapter.pushUpdate("acc-1", "people/ghost", "etag", {})).rejects.toThrow(GoogleContactNotFoundError);
  });

  it("lanza GoogleWriteConflictError cuando el etag no coincide (UC-06, flujo 3a: nunca sobrescribe a ciegas)", async () => {
    const fetchFn: FetchLike = async () => jsonResponse(400, {});
    const adapter = new GooglePeopleAdapter(async () => "token", fetchFn);
    await expect(adapter.pushUpdate("acc-1", "people/c1", "etag-obsoleto", {})).rejects.toThrow(GoogleWriteConflictError);
  });

  it("lanza GoogleWriteConflictError en HTTP 409, la señal documentada de UC-06 para etag obsoleto (regresión AUDITORIA#3 m-01)", async () => {
    const fetchFn: FetchLike = async () => jsonResponse(409, {});
    const adapter = new GooglePeopleAdapter(async () => "token", fetchFn);
    await expect(adapter.pushUpdate("acc-1", "people/c1", "etag-obsoleto", {})).rejects.toThrow(GoogleWriteConflictError);
  });

  it("nunca invoca un endpoint de creación o eliminación (ADR-17, verificación estructural del puerto)", () => {
    const adapter = new GooglePeopleAdapter(async () => "token", vi.fn());
    expect((adapter as unknown as Record<string, unknown>)["createContact"]).toBeUndefined();
    expect((adapter as unknown as Record<string, unknown>)["deleteContact"]).toBeUndefined();
  });

  it.each(["https://metadata.google.internal/latest", "people/a/../b", "people/a?next=https://evil.example"]) (
    "rechaza resourceName no canónico antes de llamar a la red: %s",
    async (remoteId) => {
      const fetchFn = vi.fn<FetchLike>();
      const adapter = new GooglePeopleAdapter(async () => "token", fetchFn);
      await expect(adapter.pushUpdate("acc-1", remoteId, "etag", {})).rejects.toThrow(InvalidGoogleResourceNameError);
      expect(fetchFn).not.toHaveBeenCalled();
    },
  );
});
