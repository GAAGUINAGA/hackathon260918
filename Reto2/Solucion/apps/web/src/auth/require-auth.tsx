import type { JSX } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth-context.js";

/** UC-08: redirige a /login si no hay sesión de Supabase activa. */
export function RequireAuth(): JSX.Element | null {
  const { session, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <p role="status" className="p-6 text-muted-foreground">
        Cargando sesión…
      </p>
    );
  }

  if (session === null) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
