import { describe, expect, it } from "vitest";

describe("apps/web smoke test", () => {
  it("carga el punto de entrada de la app", async () => {
    const mod = await import("../src/app.js");
    expect(mod.App).toBeTypeOf("function");
  });
});
