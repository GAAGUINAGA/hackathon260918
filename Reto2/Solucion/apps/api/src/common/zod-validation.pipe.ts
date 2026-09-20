import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

/**
 * RT-02: el adaptador valida esquema con zod en la frontera; el dominio
 * valida invariantes. Un input que pasa el esquema puede ser rechazado
 * por el dominio (UC-01, flujo 3a) — nunca al revés.
 */
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: "invalid_input",
        message: "El cuerpo de la petición no cumple el esquema esperado.",
        issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      });
    }
    return result.data;
  }
}
