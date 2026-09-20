import { describe, expect, it } from "vitest";
import { parseTrustProxy } from "../src/main.js";

describe("parseTrustProxy (AUDITORIA#4 O-03)", () => {
  it("sin definir preserva el comportamiento actual (undefined)", () => {
    expect(parseTrustProxy(undefined)).toBeUndefined();
  });

  it("'true'/'false' son atajos booleanos", () => {
    expect(parseTrustProxy("true")).toBe(true);
    expect(parseTrustProxy("false")).toBe(false);
  });

  it("un solo valor se pasa tal cual (una IP/CIDR del balanceador)", () => {
    expect(parseTrustProxy("10.0.0.1")).toBe("10.0.0.1");
  });

  it("varios valores separados por coma se pasan como array", () => {
    expect(parseTrustProxy("10.0.0.1, 10.0.0.2")).toEqual(["10.0.0.1", "10.0.0.2"]);
  });
});
