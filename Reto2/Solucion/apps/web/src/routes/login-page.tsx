import { useAnnouncer, useRouteFocus } from "@ssot/a11y";
import { useState, type FormEvent, type JSX } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/auth-context.js";
import { Button } from "../components/ui/button.js";
import { TextField } from "../components/ui/text-field.js";

interface LocationState {
  readonly from?: { readonly pathname: string };
}

/** UC-08: autenticación con Supabase Auth (ADR-05). El backend nunca ve la contraseña. */
export function LoginPage(): JSX.Element {
  const { session, signInWithPassword } = useAuth();
  const location = useLocation();
  const { announce } = useAnnouncer();
  const headingRef = useRouteFocus<HTMLHeadingElement>("/login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (session !== null) {
    const from = (location.state as LocationState | null)?.from?.pathname ?? "/contacts";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await signInWithPassword(email, password);
    setIsSubmitting(false);
    if (result.error !== null) {
      setError(result.error);
      announce(`Error al iniciar sesión: ${result.error}`, "assertive");
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 ref={headingRef} tabIndex={-1} className="mb-6 text-xl font-semibold">
        Iniciar sesión
      </h1>
      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <TextField
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={error ?? undefined}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
