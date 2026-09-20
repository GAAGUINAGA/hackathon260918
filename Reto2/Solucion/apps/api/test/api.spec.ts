import { describe, expect, it } from "vitest";
import { RING } from "../src/main.js";

describe("apps/api smoke test", () => {
  it("expone el marcador de anillo", () => {
    expect(RING).toBe("A3-api");
  });
});

// Guard JWT contra JWKS (ADR-05, RT-12): test/auth/jwt-verifier.spec.ts,
// test/auth/jwt-auth.guard.spec.ts. ClassSerializerInterceptor excludeAll,
// aislamiento por owner_id, 400/404 del dominio y zod: test/e2e/contacts.e2e.spec.ts.
// Gateway WebSocket autenticado: test/websocket/sync-progress.gateway.spec.ts.
// Rate limiting (RT-09): test/e2e/rate-limit.e2e.spec.ts.
