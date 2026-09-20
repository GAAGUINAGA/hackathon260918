import type { JSX } from "react";

export interface SkipLinkProps {
  /** Id del elemento principal al que salta (sin `#`). */
  readonly targetId: string;
  readonly label?: string;
}

/**
 * Enlace "saltar al contenido" (WCAG 2.1 SC 2.4.1, Bypass Blocks): el
 * primer elemento focable de la página, invisible hasta recibir foco por
 * teclado.
 */
export function SkipLink({ targetId, label = "Saltar al contenido principal" }: SkipLinkProps): JSX.Element {
  return (
    <a
      href={`#${targetId}`}
      className="ssot-skip-link"
      style={{
        position: "absolute",
        left: "0.5rem",
        top: "-3rem",
        zIndex: 100,
        padding: "0.5rem 1rem",
        background: "var(--color-primary)",
        color: "var(--color-primary-foreground)",
        borderRadius: "0.25rem",
        transition: "top 0.15s ease-in-out",
      }}
      onFocus={(event) => {
        event.currentTarget.style.top = "0.5rem";
      }}
      onBlur={(event) => {
        event.currentTarget.style.top = "-3rem";
      }}
    >
      {label}
    </a>
  );
}
