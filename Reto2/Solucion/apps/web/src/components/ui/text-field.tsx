import * as Label from "@radix-ui/react-label";
import clsx from "clsx";
import { useId, type InputHTMLAttributes, type JSX } from "react";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  readonly label: string;
  readonly error?: string | undefined;
  readonly hint?: string | undefined;
}

/**
 * Campo de formulario con etiqueta, pista y error siempre asociados por
 * `aria-describedby` (WCAG 2.1 SC 3.3.1, SC 4.1.2): un lector de pantalla
 * anuncia el error sin depender de proximidad visual.
 */
export function TextField({ label, error, hint, className, required, ...props }: TextFieldProps): JSX.Element {
  const generatedId = useId();
  const id = props.name ?? generatedId;
  const hintId = hint !== undefined ? `${id}-hint` : undefined;
  const errorId = error !== undefined ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1">
      <Label.Root htmlFor={id} className="text-sm font-medium">
        {label}
        {required === true && (
          <span aria-hidden="true" className="text-destructive">
            {" "}
            *
          </span>
        )}
      </Label.Root>
      <input
        id={id}
        required={required}
        aria-describedby={describedBy}
        aria-invalid={error !== undefined}
        className={clsx(
          "rounded-md border border-border bg-background px-3 py-2 text-sm",
          error !== undefined && "border-destructive",
          className,
        )}
        {...props}
      />
      {hint !== undefined && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
