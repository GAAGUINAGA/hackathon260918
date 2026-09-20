import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JwtAuthGuard } from "../../src/auth/jwt-auth.guard.js";
import { JwtVerificationError, type JwtVerifier } from "../../src/auth/jwt-verifier.js";
import type { RequestWithActor } from "../../src/auth/current-actor.decorator.js";

vi.mock("@ssot/infrastructure", async () => {
  const actual = await vi.importActual<typeof import("@ssot/infrastructure")>("@ssot/infrastructure");
  return { ...actual, provisionUserPreferences: vi.fn(async () => {}) };
});

import { provisionUserPreferences } from "@ssot/infrastructure";

function fakeContext(request: Partial<RequestWithActor>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("JwtAuthGuard (UC-08)", () => {
  let verifier: JwtVerifier;
  let reflector: Reflector;
  let db: unknown;

  beforeEach(() => {
    verifier = { verify: vi.fn() } as unknown as JwtVerifier;
    reflector = { getAllAndOverride: vi.fn(() => undefined) } as unknown as Reflector;
    db = {};
    vi.mocked(provisionUserPreferences).mockClear();
  });

  it("rechaza sin header Authorization", async () => {
    const guard = new JwtAuthGuard(verifier, db as never, reflector);
    await expect(guard.canActivate(fakeContext({ headers: {} }))).rejects.toThrow(UnauthorizedException);
  });

  it("rechaza un header que no empieza con 'Bearer '", async () => {
    const guard = new JwtAuthGuard(verifier, db as never, reflector);
    await expect(
      guard.canActivate(fakeContext({ headers: { authorization: "Basic xyz" } })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rechaza un token que JwtVerifier no puede verificar, sin filtrar la causa (401 genérico)", async () => {
    vi.mocked(verifier.verify).mockRejectedValue(new JwtVerificationError());
    const guard = new JwtAuthGuard(verifier, db as never, reflector);
    await expect(
      guard.canActivate(fakeContext({ headers: { authorization: "Bearer bad-token" } })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("fija request.actor con el owner_id del claim sub, aprovisiona el perfil y permite el acceso", async () => {
    vi.mocked(verifier.verify).mockResolvedValue({ sub: "user-abc", aal: "aal1" });
    const guard = new JwtAuthGuard(verifier, db as never, reflector);
    const request: RequestWithActor = { headers: { authorization: "Bearer good-token" } } as RequestWithActor;

    const allowed = await guard.canActivate(fakeContext(request));

    expect(allowed).toBe(true);
    expect(request.actor).toEqual({ ownerId: "user-abc", actorKind: "user" });
    expect(provisionUserPreferences).toHaveBeenCalledWith(db, "user-abc");
  });

  it("AUDITORIA#4 O-01: no reaprovisiona en peticiones subsiguientes del mismo usuario", async () => {
    vi.mocked(verifier.verify).mockResolvedValue({ sub: "user-abc", aal: "aal1" });
    const guard = new JwtAuthGuard(verifier, db as never, reflector);

    await guard.canActivate(fakeContext({ headers: { authorization: "Bearer good-token" } }));
    await guard.canActivate(fakeContext({ headers: { authorization: "Bearer good-token" } }));

    expect(provisionUserPreferences).toHaveBeenCalledTimes(1);
  });

  it("exige aal2 en rutas marcadas @RequireMfa() y rechaza con 403 explícito si falta (UC-09)", async () => {
    vi.mocked(verifier.verify).mockResolvedValue({ sub: "user-abc", aal: "aal1" });
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(true);
    const guard = new JwtAuthGuard(verifier, db as never, reflector);

    await expect(
      guard.canActivate(fakeContext({ headers: { authorization: "Bearer good-token" } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it("permite el acceso a una ruta @RequireMfa() cuando aal=aal2", async () => {
    vi.mocked(verifier.verify).mockResolvedValue({ sub: "user-abc", aal: "aal2" });
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(true);
    const guard = new JwtAuthGuard(verifier, db as never, reflector);

    const allowed = await guard.canActivate(fakeContext({ headers: { authorization: "Bearer good-token" } }));
    expect(allowed).toBe(true);
  });
});
