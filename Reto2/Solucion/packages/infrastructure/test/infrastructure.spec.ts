import { describe, expect, it } from "vitest";

describe("packages/infrastructure smoke test", () => {
  it("carga el paquete y resuelve @ssot/domain y @ssot/application", async () => {
    const mod = await import("../src/index.js");
    expect(mod).toBeDefined();
  });
});

// RLS FORCE + WITH CHECK, SET LOCAL app.current_user_id, indices unicos
// parciales WHERE state: test/integration/rls.integration.spec.ts.
// Cifrado AES-256-GCM: test/crypto/token-cipher.spec.ts.
// Outbox transaccional: test/integration/transactional-contact-writes.integration.spec.ts
// y test/integration/outbox-relay.integration.spec.ts.
