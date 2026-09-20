import { useEffect, useRef, type RefObject } from "react";

/**
 * En una SPA, cambiar de ruta no mueve el foco ni lo anuncia por sí solo
 * (a diferencia de una navegación de página completa): un usuario de
 * lector de pantalla no se entera de que "llegó" a otra pantalla. Este
 * hook mueve el foco al encabezado de la pantalla en cada cambio de
 * `routeKey` (WCAG 2.1 SC 2.4.3, orden de foco; SC 4.1.3, mensajes de
 * estado).
 *
 * El elemento referenciado debe ser focable programáticamente
 * (`tabIndex={-1}` en un `<h1>`, por ejemplo).
 */
export function useRouteFocus<T extends HTMLElement = HTMLElement>(routeKey: string): RefObject<T | null> {
  const headingRef = useRef<T | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [routeKey]);

  return headingRef;
}
