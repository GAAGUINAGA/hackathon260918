import { useAnnouncer, useRouteFocus } from "@ssot/a11y";
import { useState, type FormEvent, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { useContactsControllerCreate } from "../api/generated/contacts/contacts.js";
import { ApiError } from "../api/fetch-client.js";
import { Button } from "../components/ui/button.js";
import { TextField } from "../components/ui/text-field.js";

interface FieldErrors {
  readonly displayName?: string;
  readonly company?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly general?: string;
}

/**
 * UC-01: crear contacto local. La UI ofrece un correo y un teléfono
 * (ambos marcados como principales): `apps/api` acepta varios por
 * contacto, pero esta pantalla cubre el caso de uso mayoritario sin
 * introducir una UI de listas dinámicas todavía sin un caso de uso que
 * la exija (KISS).
 */
export function NewContactPage(): JSX.Element {
  const headingRef = useRouteFocus<HTMLHeadingElement>("/contacts/new");
  const { announce } = useAnnouncer();
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useContactsControllerCreate();

  const [displayName, setDisplayName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrors({});

    try {
      const result = await mutateAsync({
        data: {
          ...(displayName.trim() !== "" && { displayName: displayName.trim() }),
          ...(company.trim() !== "" && { company: company.trim() }),
          ...(email.trim() !== "" && { emails: [{ raw: email.trim(), isPrincipal: true }] }),
          ...(phone.trim() !== "" && { phones: [{ raw: phone.trim(), isPrincipal: true }] }),
        },
      });
      announce("Contacto creado.");
      navigate(`/contacts/${result.contactId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({ [error.field ?? "general"]: error.message } as FieldErrors);
        announce(`No se pudo crear el contacto: ${error.message}`, "assertive");
      } else {
        setErrors({ general: "No se pudo crear el contacto." });
      }
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 ref={headingRef} tabIndex={-1} className="mb-6 text-xl font-semibold">
        Nuevo contacto
      </h1>
      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <TextField
          label="Nombre"
          name="displayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          error={errors.displayName}
        />
        <TextField
          label="Empresa"
          name="company"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          error={errors.company}
        />
        <TextField
          label="Correo electrónico"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />
        <TextField
          label="Teléfono"
          name="phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={errors.phone}
        />
        {errors.general !== undefined && (
          <p role="alert" className="text-sm text-destructive">
            {errors.general}
          </p>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando…" : "Crear contacto"}
        </Button>
      </form>
    </div>
  );
}
