import { useRouteFocus } from "@ssot/a11y";
import type { JSX } from "react";
import { Link, useParams } from "react-router-dom";
import { useContactsControllerFindById } from "../api/generated/contacts/contacts.js";
import { ApiError } from "../api/fetch-client.js";

/** UC-12: consultar detalle de contacto. Inexistente/ajeno/retirado -> 404 (RT-15). */
export function ContactDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const headingRef = useRouteFocus<HTMLHeadingElement>(`/contacts/${id ?? ""}`);

  const { data, isLoading, error } = useContactsControllerFindById(id ?? "", {
    query: { enabled: id !== undefined },
  });

  if (isLoading) {
    return (
      <p role="status" className="text-muted-foreground">
        Cargando contacto…
      </p>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div>
        <h1 ref={headingRef} tabIndex={-1} className="mb-4 text-xl font-semibold">
          Contacto no encontrado
        </h1>
        <p className="text-muted-foreground">
          No existe, no te pertenece o fue retirado a la papelera.{" "}
          <Link to="/contacts" className="underline">
            Volver al listado
          </Link>
        </p>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <p role="alert" className="text-destructive">
        No se pudo cargar el contacto.
      </p>
    );
  }

  return (
    <div>
      <h1 ref={headingRef} tabIndex={-1} className="mb-4 text-xl font-semibold">
        {data.displayName ?? "(sin nombre)"}
      </h1>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="font-medium">Empresa</dt>
        <dd>{data.company ?? "—"}</dd>
        <dt className="font-medium">Correo principal</dt>
        <dd>{data.primaryEmail ?? "—"}</dd>
        <dt className="font-medium">Teléfono principal</dt>
        <dd>{data.primaryPhone ?? "—"}</dd>
      </dl>
      <p className="mt-6">
        <Link to="/contacts" className="underline">
          Volver al listado
        </Link>
      </p>
    </div>
  );
}
