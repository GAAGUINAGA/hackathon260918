import { useRouteFocus } from "@ssot/a11y";
import type { JSX } from "react";
import { Link } from "react-router-dom";

export function NotFoundPage(): JSX.Element {
  const headingRef = useRouteFocus<HTMLHeadingElement>("/404");

  return (
    <div>
      <h1 ref={headingRef} tabIndex={-1} className="mb-4 text-xl font-semibold">
        Página no encontrada
      </h1>
      <p>
        <Link to="/contacts" className="underline">
          Volver al listado de contactos
        </Link>
      </p>
    </div>
  );
}
