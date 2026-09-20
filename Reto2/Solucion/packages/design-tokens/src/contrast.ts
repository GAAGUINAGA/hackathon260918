/**
 * Formula de contraste WCAG 2.1 (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance),
 * usada para verificar mecanicamente (ADR-12) que los pares de color de
 * `tokens.ts` cumplen los umbrales de contraste de texto (SC 1.4.3, AA:
 * 4.5:1) y de componentes no textuales (SC 1.4.11, AA: 3:1).
 */

function srgbChannelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex: string): readonly [number, number, number] {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return [r, g, b];
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgbChannelToLinear(r) + 0.7152 * srgbChannelToLinear(g) + 0.0722 * srgbChannelToLinear(b);
}

/** Devuelve el ratio de contraste (1 a 21) entre dos colores hex. */
export function contrastRatio(hexA: string, hexB: string): number {
  const luminanceA = relativeLuminance(hexA);
  const luminanceB = relativeLuminance(hexB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

export const WCAG_AA_TEXT_MIN_CONTRAST = 4.5;
export const WCAG_AA_NON_TEXT_MIN_CONTRAST = 3;
