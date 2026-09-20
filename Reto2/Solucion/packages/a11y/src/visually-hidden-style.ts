import type { CSSProperties } from "react";

/** Oculta visualmente sin usar `display:none` (que también lo ocultaría de la accesibilidad). */
export const visuallyHiddenStyle: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};
