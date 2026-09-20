import { SkipLink } from "@ssot/a11y";
import type { JSX, PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/auth-context.js";
import { Button } from "../ui/button.js";

const navLinkClassName = ({ isActive }: { isActive: boolean }): string =>
  `rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`;

/**
 * Cabecera y navegación de la consola (CLAUDE.md Fase 5): navegación
 * completa por teclado (todo son `<a>`/`<button>` nativos), enlace
 * "saltar al contenido" y una única región principal identificada por
 * `id="main-content"`.
 */
export function AppShell({ children }: PropsWithChildren): JSX.Element {
  const { session, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SkipLink targetId="main-content" />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="font-semibold">SSOT Contactos</span>
          <nav aria-label="Principal" className="flex items-center gap-2">
            <NavLink to="/contacts" className={navLinkClassName} end>
              Contactos
            </NavLink>
            <NavLink to="/contacts/new" className={navLinkClassName}>
              Nuevo contacto
            </NavLink>
          </nav>
          {session !== null && (
            <Button variant="secondary" onClick={() => void signOut()}>
              Cerrar sesión
            </Button>
          )}
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
