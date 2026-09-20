import { createContext, useCallback, useContext, useMemo, useRef, useState, type JSX, type PropsWithChildren } from "react";
import { visuallyHiddenStyle } from "./visually-hidden-style.js";

export type AnnouncePriority = "polite" | "assertive";

export interface AnnouncerContextValue {
  /** Anuncia un mensaje a lectores de pantalla sin mover el foco. */
  readonly announce: (message: string, priority?: AnnouncePriority) => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);

/**
 * Región `aria-live` compartida para anunciar estados asíncronos sin
 * recargar la página (ADR-06, CLAUDE.md Fase 5: "aria-live para estados
 * asíncronos"). Monta una única vez cerca de la raíz de la app.
 *
 * El mensaje se limpia y se vuelve a escribir tras un `setTimeout`: varios
 * lectores de pantalla no re-anuncian un `aria-live` si el texto entrante
 * es idéntico al que ya estaba, así que forzamos una mutación real del
 * DOM en cada llamada.
 */
export function AnnouncerProvider({ children }: PropsWithChildren): JSX.Element {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");
  const pendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string, priority: AnnouncePriority = "polite") => {
    const setMessage = priority === "assertive" ? setAssertiveMessage : setPoliteMessage;
    if (pendingTimeout.current !== null) {
      clearTimeout(pendingTimeout.current);
    }
    setMessage("");
    pendingTimeout.current = setTimeout(() => setMessage(message), 50);
  }, []);

  const value = useMemo<AnnouncerContextValue>(() => ({ announce }), [announce]);

  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
        {politeMessage}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" style={visuallyHiddenStyle}>
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}

/** Debe llamarse dentro de un árbol envuelto por `<AnnouncerProvider>`. */
export function useAnnouncer(): AnnouncerContextValue {
  const context = useContext(AnnouncerContext);
  if (context === null) {
    throw new Error("useAnnouncer() debe usarse dentro de <AnnouncerProvider>.");
  }
  return context;
}
