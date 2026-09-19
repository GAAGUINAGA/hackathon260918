import { err, ok, type Result } from "neverthrow";
import { validationError, type ValidationError } from "../errors/validation-error.js";
import { getCallingCode } from "./calling-codes.js";

const FORMATTING_CHARS = /[\s().-]/g;
const DIGITS_ONLY = /^[0-9]+$/;
const MIN_SIGNIFICANT_DIGITS = 6;
const MAX_E164_DIGITS = 15;

/**
 * Value object de teléfono (ADR-10). Nunca rechaza un número plausible por
 * falta de región inferible: lo conserva `unnormalized` (UC-01, flujo 3c) en
 * lugar de bloquear la creación del contacto. Solo rechaza entradas que no
 * son, estructuralmente, un número de teléfono.
 */
export class PhoneNumber {
  private constructor(
    public readonly rawInput: string,
    public readonly e164: string | null,
    public readonly isNormalized: boolean,
  ) {}

  static create(raw: string, defaultRegion?: string): Result<PhoneNumber, ValidationError> {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return err(validationError("phone_empty", "El teléfono no puede estar vacío.", "phone"));
    }

    let stripped = trimmed.replace(FORMATTING_CHARS, "");
    const hasLeadingPlus = stripped.startsWith("+");
    if (stripped.startsWith("00")) {
      stripped = `+${stripped.slice(2)}`;
    }
    const digitsOnlyPart = hasLeadingPlus || stripped.startsWith("+") ? stripped.slice(1) : stripped;

    if (digitsOnlyPart.length === 0 || !DIGITS_ONLY.test(digitsOnlyPart)) {
      return err(
        validationError("phone_invalid_characters", "El teléfono contiene caracteres no válidos.", "phone"),
      );
    }
    if (digitsOnlyPart.length < MIN_SIGNIFICANT_DIGITS || digitsOnlyPart.length > MAX_E164_DIGITS) {
      return err(validationError("phone_invalid_length", "El teléfono tiene una longitud inválida.", "phone"));
    }

    if (stripped.startsWith("+")) {
      return ok(new PhoneNumber(trimmed, `+${digitsOnlyPart}`, true));
    }

    const callingCode = defaultRegion ? getCallingCode(defaultRegion) : undefined;
    if (!callingCode) {
      // 3c (UC-01): sin región inferible, se conserva en crudo.
      return ok(new PhoneNumber(trimmed, null, false));
    }

    // La entrada puede ya incluir el código de país sin "+" (p. ej.
    // "593991234567" o "(593) 991-234-567"). Anteponer el código de nuevo en
    // ese caso corrompería el E.164 (doble prefijo). Si la parte significativa
    // ya empieza por el código de la región y el resto tiene una longitud
    // nacional plausible, se trata como ya internacional.
    if (digitsOnlyPart.startsWith(callingCode)) {
      const remainderAfterCallingCode = digitsOnlyPart.slice(callingCode.length);
      const maxNationalDigits = MAX_E164_DIGITS - callingCode.length;
      if (
        remainderAfterCallingCode.length >= MIN_SIGNIFICANT_DIGITS &&
        remainderAfterCallingCode.length <= maxNationalDigits
      ) {
        return ok(new PhoneNumber(trimmed, `+${digitsOnlyPart}`, true));
      }
    }

    const nationalNumber = digitsOnlyPart.startsWith("0") ? digitsOnlyPart.slice(1) : digitsOnlyPart;
    const combined = `${callingCode}${nationalNumber}`;
    if (combined.length > MAX_E164_DIGITS || nationalNumber.length === 0) {
      return ok(new PhoneNumber(trimmed, null, false));
    }

    return ok(new PhoneNumber(trimmed, `+${combined}`, true));
  }
}
