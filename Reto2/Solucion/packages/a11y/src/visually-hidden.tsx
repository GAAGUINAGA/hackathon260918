import type { JSX, PropsWithChildren } from "react";
import { visuallyHiddenStyle } from "./visually-hidden-style.js";

/**
 * Oculta contenido visualmente sin quitarlo del árbol de accesibilidad
 * (WCAG 2.1 SC 1.3.1, 4.1.2): usar `display:none` en su lugar lo
 * ocultaría también para lectores de pantalla.
 */
export function VisuallyHidden({ children }: PropsWithChildren): JSX.Element {
  return <span style={visuallyHiddenStyle}>{children}</span>;
}
