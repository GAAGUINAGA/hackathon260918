import type { JSX } from "react";

/**
 * Pantalla mostrada cuando faltan variables de entorno vitales
 * (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL). Sin
 * ellas la app no puede autenticar ni llamar a `apps/api`: es mejor un
 * mensaje claro que una pantalla en blanco o un error de consola.
 */
export function ConfigMissingPage({ missing }: { readonly missing: readonly string[] }): JSX.Element {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-xl font-semibold">Configuración incompleta</h1>
      <p className="mb-2">Faltan estas variables de entorno:</p>
      <ul className="mb-4 list-disc pl-6">
        {missing.map((name) => (
          <li key={name} className="font-mono text-sm">
            {name}
          </li>
        ))}
      </ul>
      <p>
        Copia <code className="font-mono">apps/web/.env.example</code> a{" "}
        <code className="font-mono">apps/web/.env.local</code> y completa los valores del proyecto de Supabase.
      </p>
    </main>
  );
}
