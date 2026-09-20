import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type JSX, type PropsWithChildren } from "react";
import { getSupabaseClient } from "../lib/supabase.js";

export interface AuthContextValue {
  readonly session: Session | null;
  /** `undefined` mientras se resuelve la sesión inicial (evita parpadeo hacia /login). */
  readonly isLoading: boolean;
  readonly signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  readonly signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** UC-08: sesión delegada en Supabase Auth (ADR-05). No custodia contraseñas ni tokens propios. */
export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const client = getSupabaseClient();
    let active = true;

    void client.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setIsLoading(false);
      }
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      signInWithPassword: async (email, password) => {
        const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await getSupabaseClient().auth.signOut();
      },
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth() debe usarse dentro de <AuthProvider>.");
  }
  return context;
}
