import { describe, expect, it } from "vitest";
import { normalizeForComparison, stripDiacritics, toNFKC, trigramSimilarity } from "../../src/shared/text-normalization.js";

describe("toNFKC", () => {
  it("aplica la forma de compatibilidad canónica", () => {
    // "ﬁ" (ligadura U+FB01) se descompone a "fi" bajo NFKC.
    expect(toNFKC("ﬁle")).toBe("file");
  });
});

describe("stripDiacritics", () => {
  it("elimina marcas diacríticas conservando la letra base", () => {
    expect(stripDiacritics("José")).toBe("Jose");
    expect(stripDiacritics("Ñandú")).toBe("Nandu");
  });
});

describe("normalizeForComparison", () => {
  it("recorta, aplica NFKC, quita diacríticos, minúsculas y colapsa espacios", () => {
    expect(normalizeForComparison("  José   Pérez  ")).toBe("jose perez");
  });

  it("hace que 'jose' y 'José' se consideren equivalentes", () => {
    expect(normalizeForComparison("jose")).toBe(normalizeForComparison("José"));
  });
});

describe("trigramSimilarity", () => {
  it("devuelve 1 para cadenas idénticas", () => {
    expect(trigramSimilarity("ana perez", "ana perez")).toBe(1);
  });

  it("devuelve 0 cuando alguna cadena está vacía", () => {
    expect(trigramSimilarity("", "ana")).toBe(0);
    expect(trigramSimilarity("ana", "")).toBe(0);
  });

  it("da una similitud alta a nombres casi idénticos", () => {
    const similarity = trigramSimilarity("ana maria perez", "ana maria peres");
    expect(similarity).toBeGreaterThan(0.7);
  });

  it("da una similitud baja a nombres sin relación", () => {
    const similarity = trigramSimilarity("ana maria perez", "roberto gonzalez");
    expect(similarity).toBeLessThan(0.2);
  });
});
