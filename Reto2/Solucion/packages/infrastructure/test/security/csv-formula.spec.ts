import { describe, expect, it } from "vitest";
import { neutralizeCsvFormula } from "../../src/security/csv-formula.js";

describe("neutralizeCsvFormula (UC-07 4b, UC-18 3)", () => {
  it.each(["=1+1", "+cmd", "-10+20", "@SUM(A1:A2)", "  =HYPERLINK(\"https://bad.example\")"]) (
    "neutraliza una fórmula potencial: %s",
    (value) => expect(neutralizeCsvFormula(value)).toBe(`'${value}`),
  );

  it("deja intacto el texto ordinario", () => {
    expect(neutralizeCsvFormula("Contacto de demostración")).toBe("Contacto de demostración");
  });
});
