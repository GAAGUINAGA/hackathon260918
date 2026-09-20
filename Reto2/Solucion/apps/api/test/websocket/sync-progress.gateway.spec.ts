import { describe, expect, it, vi } from "vitest";
import type { Socket } from "socket.io";
import { SyncProgressGateway } from "../../src/websocket/sync-progress.gateway.js";
import { JwtVerificationError, type JwtVerifier } from "../../src/auth/jwt-verifier.js";

function fakeSocket(auth: Record<string, unknown>, headers: Record<string, unknown> = {}): Socket {
  return {
    id: "socket-1",
    handshake: { auth, headers },
    data: {},
    join: vi.fn(async () => {}),
    disconnect: vi.fn(),
  } as unknown as Socket;
}

describe("SyncProgressGateway (ADR-06, handshake autenticado)", () => {
  it("desconecta cuando no hay token en el handshake", async () => {
    const verifier = { verify: vi.fn() } as unknown as JwtVerifier;
    const gateway = new SyncProgressGateway(verifier);
    const socket = fakeSocket({});

    await gateway.handleConnection(socket);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it("desconecta cuando el token no verifica (ADR-05)", async () => {
    const verifier = { verify: vi.fn().mockRejectedValue(new JwtVerificationError()) } as unknown as JwtVerifier;
    const gateway = new SyncProgressGateway(verifier);
    const socket = fakeSocket({ token: "bad-token" });

    await gateway.handleConnection(socket);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it("une al socket a la sala de su propietario cuando el token es válido", async () => {
    const verifier = { verify: vi.fn().mockResolvedValue({ sub: "owner-1", aal: "aal1" }) } as unknown as JwtVerifier;
    const gateway = new SyncProgressGateway(verifier);
    const socket = fakeSocket({ token: "good-token" });

    await gateway.handleConnection(socket);

    expect(socket.join).toHaveBeenCalledWith("owner:owner-1");
    expect(socket.disconnect).not.toHaveBeenCalled();
    expect(socket.data["ownerId"]).toBe("owner-1");
  });

  it("acepta el token también desde el header Authorization", async () => {
    const verifier = { verify: vi.fn().mockResolvedValue({ sub: "owner-2", aal: "aal1" }) } as unknown as JwtVerifier;
    const gateway = new SyncProgressGateway(verifier);
    const socket = fakeSocket({}, { authorization: "Bearer good-token" });

    await gateway.handleConnection(socket);

    expect(verifier.verify).toHaveBeenCalledWith("good-token");
    expect(socket.join).toHaveBeenCalledWith("owner:owner-2");
  });

  it("emitJobProgress emite solo a la sala del propietario indicado (emisión agregada, ADR-06)", () => {
    const verifier = {} as JwtVerifier;
    const gateway = new SyncProgressGateway(verifier);
    const to = vi.fn().mockReturnValue({ emit: vi.fn() });
    gateway.server = { to } as never;

    gateway.emitJobProgress("owner-1", { jobId: "job-1", status: "running" });

    expect(to).toHaveBeenCalledWith("owner:owner-1");
  });
});
