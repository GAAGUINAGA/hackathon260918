import { useAnnouncer, useRouteFocus } from "@ssot/a11y";
import { useEffect, useState, type FormEvent, type JSX } from "react";
import { Link } from "react-router-dom";
import { useContactsControllerList } from "../api/generated/contacts/contacts.js";
import { Button } from "../components/ui/button.js";
import { TextField } from "../components/ui/text-field.js";

/** UC-11: buscar, filtrar y listar contactos (papelera y demás filtros: fuera del alcance de apps/api hoy). */
export function ContactsListPage(): JSX.Element {
  const headingRef = useRouteFocus<HTMLHeadingElement>("/contacts");
  const { announce } = useAnnouncer();

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState<string | undefined>(undefined);
  const [cursors, setCursors] = useState<readonly string[]>([]);

  const cursor = cursors.at(-1);
  const { data, isLoading, isError, error } = useContactsControllerList({
    ...(searchTerm !== undefined && { searchTerm }),
    ...(cursor !== undefined && { cursor }),
    limit: 25,
  });

  useEffect(() => {
    if (isError) {
      announce("No se pudieron cargar los contactos.", "assertive");
    }
  }, [isError, announce]);

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setCursors([]);
    setSearchTerm(searchInput.trim() === "" ? undefined : searchInput.trim());
  }

  return (
    <div>
      <h1 ref={headingRef} tabIndex={-1} className="mb-6 text-xl font-semibold">
        Contactos
      </h1>

      <form className="mb-6 flex items-end gap-2" onSubmit={handleSearch} role="search">
        <div className="flex-1">
          <TextField
            label="Buscar contactos"
            name="searchTerm"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nombre, empresa, correo…"
          />
        </div>
        <Button type="submit">Buscar</Button>
      </form>

      {isLoading && (
        <p role="status" className="text-muted-foreground">
          Cargando contactos…
        </p>
      )}

      {isError && (
        <p role="alert" className="text-destructive">
          {error instanceof Error ? error.message : "No se pudieron cargar los contactos."}
        </p>
      )}

      {data !== undefined && data.items.length === 0 && <p className="text-muted-foreground">Sin resultados.</p>}

      {data !== undefined && data.items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.items.map((contact) => (
            <li key={contact.id} className="rounded-md border border-border p-3">
              <Link to={`/contacts/${contact.id}`} className="font-medium underline-offset-2 hover:underline">
                {contact.displayName ?? "(sin nombre)"}
              </Link>
              <p className="text-sm text-muted-foreground">
                {[contact.company, contact.primaryEmail, contact.primaryPhone].filter(Boolean).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}

      {data?.nextCursor !== null && data?.nextCursor !== undefined && (
        <div className="mt-4">
          <Button
            variant="secondary"
            onClick={() => {
              const nextCursor = data.nextCursor;
              if (nextCursor !== null) {
                setCursors((previous) => [...previous, nextCursor]);
              }
            }}
          >
            Cargar más
          </Button>
        </div>
      )}
    </div>
  );
}
