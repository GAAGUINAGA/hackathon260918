import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

/**
 * DTO de salida limpio (CLAUDE.md Fase 4): con
 * `ClassSerializerInterceptor` + `excludeExtraneousValues: true` global,
 * solo las propiedades marcadas `@Expose()` sobreviven a la serialización
 * — cualquier campo interno que un puerto añada después queda excluido
 * por defecto, no al revés. `@ApiProperty` es documentación pura para
 * `openapi.json` (ADR-08): no participa en la serialización real.
 */
export class ContactSummaryResponse {
  @Expose() @ApiProperty({ format: "uuid" }) id!: string;
  @Expose() @ApiProperty({ type: String, nullable: true }) displayName!: string | null;
  @Expose() @ApiProperty({ type: String, nullable: true }) company!: string | null;
  @Expose() @ApiProperty({ type: String, nullable: true }) primaryEmail!: string | null;
  @Expose() @ApiProperty({ type: String, nullable: true }) primaryPhone!: string | null;
}

export class ListContactsResponse {
  @Expose() @ApiProperty({ type: () => ContactSummaryResponse, isArray: true }) items!: ContactSummaryResponse[];
  @Expose() @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}

export class CreateContactResponse {
  @Expose() @ApiProperty({ format: "uuid" }) contactId!: string;
  @Expose() @ApiProperty() version!: number;
}
