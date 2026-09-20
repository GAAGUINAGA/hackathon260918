import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CrearContacto, type ActorContext, type CrearContactoCommand, type ListContactsQuery } from "@ssot/application";
import type { ValidationError } from "@ssot/domain";
import { randomUUID } from "node:crypto";
import { CurrentActor } from "../auth/current-actor.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { type Database, DrizzleContactQuery, withTransactionalContactWrites } from "@ssot/infrastructure";
import { DATABASE } from "../database/database.module.js";
import { omitUndefinedDeep } from "../common/omit-undefined.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { createContactRequestSchema, type CreateContactRequest } from "./dto/create-contact.request.js";
import { listContactsRequestSchema, type ListContactsRequest } from "./dto/list-contacts.request.js";
import { ContactSummaryResponse, CreateContactResponse, ListContactsResponse } from "./dto/contact-summary.response.js";

/** UC-01, UC-11, UC-12. ADR-19a: la lectura invoca el puerto directamente, sin caso de uso intermedio. */
@Controller("v1/contacts")
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Post()
  async create(
    @CurrentActor() actor: ActorContext,
    @Body(new ZodValidationPipe(createContactRequestSchema)) body: CreateContactRequest,
  ): Promise<CreateContactResponse> {
    const command = omitUndefinedDeep(body) as CrearContactoCommand;
    const result = await withTransactionalContactWrites(this.db, actor, async (ports) => {
      const useCase = new CrearContacto(ports.contactRepository, ports.outbox, () => randomUUID());
      return useCase.execute(actor, command);
    });

    if (result.isErr()) {
      throw domainErrorToHttp(result.error);
    }

    const response = new CreateContactResponse();
    response.contactId = result.value.contactId;
    response.version = result.value.version;
    return response;
  }

  @Get()
  async list(
    @CurrentActor() actor: ActorContext,
    @Query(new ZodValidationPipe(listContactsRequestSchema)) query: ListContactsRequest,
  ): Promise<ListContactsResponse> {
    const contactQuery = new DrizzleContactQuery(this.db);
    const page = await contactQuery.list(actor, omitUndefinedDeep(query) as ListContactsQuery);

    const response = new ListContactsResponse();
    response.items = page.items.map(toContactSummaryResponse);
    response.nextCursor = page.nextCursor;
    return response;
  }

  @Get(":id")
  async findById(
    @CurrentActor() actor: ActorContext,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<ContactSummaryResponse> {
    const contactQuery = new DrizzleContactQuery(this.db);
    const summary = await contactQuery.findSummaryById(actor, id);

    // UC-12, flujo 2a: inexistente, ajeno o retirado -> 404 en los tres
    // casos, nunca 403 (un 403 confirmaría que el id existe y es de otro).
    if (summary === null) {
      throw new NotFoundException({ code: "contact_not_found", message: "Contacto no encontrado." });
    }

    return toContactSummaryResponse(summary);
  }
}

function toContactSummaryResponse(summary: {
  id: string;
  displayName: string | null;
  company: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
}): ContactSummaryResponse {
  const response = new ContactSummaryResponse();
  response.id = summary.id;
  response.displayName = summary.displayName;
  response.company = summary.company;
  response.primaryEmail = summary.primaryEmail;
  response.primaryPhone = summary.primaryPhone;
  return response;
}

function domainErrorToHttp(error: ValidationError): BadRequestException {
  // UC-01, flujo 3a: HTTP 400 con los campos inválidos y su motivo, sin
  // trazas internas (RT-07).
  return new BadRequestException({ code: error.code, message: error.message, field: error.field });
}
