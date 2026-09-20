import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  nonTextContrastPairs,
  textContrastPairs,
  WCAG_AA_NON_TEXT_MIN_CONTRAST,
  WCAG_AA_TEXT_MIN_CONTRAST,
} from "../src/index.js";
import { colorTokens } from "../src/tokens.js";

describe("contraste de color (ADR-12, WCAG 2.1 AA)", () => {
  it.each([
    ["light", colorTokens.light],
    ["dark", colorTokens.dark],
  ] as const)("%s: pares de texto cumplen >= 4.5:1 (SC 1.4.3)", (_name, tokens) => {
    for (const [background, foreground] of textContrastPairs(tokens)) {
      expect(contrastRatio(background, foreground)).toBeGreaterThanOrEqual(WCAG_AA_TEXT_MIN_CONTRAST);
    }
  });

  it.each([
    ["light", colorTokens.light],
    ["dark", colorTokens.dark],
  ] as const)("%s: bordes y anillo de foco cumplen >= 3:1 (SC 1.4.11)", (_name, tokens) => {
    for (const [background, ui] of nonTextContrastPairs(tokens)) {
      expect(contrastRatio(background, ui)).toBeGreaterThanOrEqual(WCAG_AA_NON_TEXT_MIN_CONTRAST);
    }
  });
});
