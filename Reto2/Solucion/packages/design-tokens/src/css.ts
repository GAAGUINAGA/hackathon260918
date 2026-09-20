import { colorTokens, spacingTokens, typographyTokens, type ColorTokens } from "./tokens.js";

function kebabCase(camel: string): string {
  return camel.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function colorVariables(tokens: ColorTokens): string {
  return Object.entries(tokens)
    .map(([key, value]) => `  --color-${kebabCase(key)}: ${value};`)
    .join("\n");
}

/**
 * Proyecta los tokens a variables CSS. El tema oscuro se activa por
 * `data-theme="dark"` explícito o por `prefers-color-scheme: dark` del
 * sistema operativo cuando no hay una preferencia explícita de claro.
 */
export function toCssVariables(): string {
  const spacing = Object.entries(spacingTokens)
    .map(([key, value]) => `  --space-${key}: ${value / 16}rem;`)
    .join("\n");
  const typography = [
    `  --font-family-base: ${typographyTokens.fontFamily};`,
    `  --font-size-sm: ${typographyTokens.sizeSm / 16}rem;`,
    `  --font-size-base: ${typographyTokens.sizeBase / 16}rem;`,
    `  --font-size-lg: ${typographyTokens.sizeLg / 16}rem;`,
    `  --font-size-xl: ${typographyTokens.sizeXl / 16}rem;`,
  ].join("\n");

  return `/* Generado por packages/design-tokens — no editar a mano (ADR-02). */
:root {
${colorVariables(colorTokens.light)}
${spacing}
${typography}
}

:root[data-theme="dark"] {
${colorVariables(colorTokens.dark)}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${colorVariables(colorTokens.dark)}
  }
}
`;
}
