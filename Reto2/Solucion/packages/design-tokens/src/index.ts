/**
 * Tokens de diseño compartidos entre React (CSS vars) y Flutter
 * (ThemeData). Fuente única de verdad en `tokens.ts`; `css.ts` y
 * `dart.ts` la proyectan a cada plataforma (ADR-02).
 */
export { colorTokens, spacingTokens, typographyTokens, textContrastPairs, nonTextContrastPairs } from "./tokens.js";
export type { ColorTokens, ThemeTokens, SpacingTokens, TypographyTokens } from "./tokens.js";
export { contrastRatio, relativeLuminance, WCAG_AA_TEXT_MIN_CONTRAST, WCAG_AA_NON_TEXT_MIN_CONTRAST } from "./contrast.js";
export { toCssVariables } from "./css.js";
export { toDartTheme } from "./dart.js";
