/**
 * Fuente única de verdad de los tokens de diseño (ADR-02). `css.ts` los
 * proyecta a variables CSS para la consola web; `dart.ts` los proyecta a
 * `ThemeData` para Flutter. Cambiar un color aquí basta para propagarlo a
 * ambos clientes tras `pnpm --filter @ssot/design-tokens run build`.
 */

export interface ColorTokens {
  readonly background: string;
  readonly foreground: string;
  readonly muted: string;
  readonly mutedForeground: string;
  readonly primary: string;
  readonly primaryForeground: string;
  readonly destructive: string;
  readonly destructiveForeground: string;
  readonly border: string;
  readonly ring: string;
}

export interface ThemeTokens {
  readonly light: ColorTokens;
  readonly dark: ColorTokens;
}

// Paleta basada en Tailwind slate/blue/red. Los valores exactos están
// verificados por contraste en `test/contrast.spec.ts` (ADR-12): no
// cambiar un color sin correr esa prueba.
export const colorTokens: ThemeTokens = {
  light: {
    background: "#ffffff",
    foreground: "#0f172a",
    muted: "#f1f5f9",
    mutedForeground: "#3f4a5c",
    primary: "#1d4ed8",
    primaryForeground: "#ffffff",
    destructive: "#b91c1c",
    destructiveForeground: "#ffffff",
    border: "#64748b",
    ring: "#1d4ed8",
  },
  dark: {
    background: "#0b1220",
    foreground: "#e2e8f0",
    muted: "#1e293b",
    mutedForeground: "#a9b6c9",
    primary: "#60a5fa",
    primaryForeground: "#0b1220",
    destructive: "#f87171",
    destructiveForeground: "#1a0505",
    border: "#64748b",
    ring: "#60a5fa",
  },
};

export interface SpacingTokens {
  readonly xs: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly xl: number;
  readonly "2xl": number;
}

// Escala en px (múltiplos de 4), consumida como rem en CSS y como
// `EdgeInsets`/`SizedBox` en Flutter.
export const spacingTokens: SpacingTokens = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
};

export interface TypographyTokens {
  readonly fontFamily: string;
  readonly sizeSm: number;
  readonly sizeBase: number;
  readonly sizeLg: number;
  readonly sizeXl: number;
}

export const typographyTokens: TypographyTokens = {
  fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  sizeSm: 14,
  sizeBase: 16,
  sizeLg: 20,
  sizeXl: 28,
};

/**
 * Pares que deben cumplir el umbral de contraste de texto (SC 1.4.3, AA
 * 4.5:1): `[fondo, texto]`.
 */
export function textContrastPairs(tokens: ColorTokens): ReadonlyArray<readonly [string, string]> {
  return [
    [tokens.background, tokens.foreground],
    [tokens.muted, tokens.mutedForeground],
    [tokens.primary, tokens.primaryForeground],
    [tokens.destructive, tokens.destructiveForeground],
  ];
}

/**
 * Pares que deben cumplir el umbral de contraste no textual (SC 1.4.11,
 * AA 3:1): bordes visibles y anillo de foco contra el fondo.
 */
export function nonTextContrastPairs(tokens: ColorTokens): ReadonlyArray<readonly [string, string]> {
  return [
    [tokens.background, tokens.border],
    [tokens.background, tokens.ring],
  ];
}
