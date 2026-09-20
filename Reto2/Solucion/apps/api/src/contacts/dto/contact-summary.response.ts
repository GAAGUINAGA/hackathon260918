import { Expose } from "class-transformer";

/**
 * DTO de salida limpio (CLAUDE.md Fase 4): con
 * `ClassSerializerInterceptor` + `excludeExtraneousValues: true` global,
 * solo las propiedades marcadas `@Expose()` sobreviven a la serialización
 * — cualquier campo interno que un puerto añada después queda excluido
 * por defecto, no al revés.
 */
export class ContactSummaryResponse {
  @Expose() id!: string;
  @Expose() displayName!: string | null;
  @Expose() company!: string | null;
  @Expose() primaryEmail!: string | null;
  @Expose() primaryPhone!: string | null;
}

export class ListContactsResponse {
  @Expose() items!: ContactSummaryResponse[];
  @Expose() nextCursor!: string | null;
}

export class CreateContactResponse {
  @Expose() contactId!: string;
  @Expose() version!: number;
}
