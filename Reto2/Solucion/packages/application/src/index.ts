/**
 * Anillo 1 (Aplicacion). Orquesta casos de uso contra puertos.
 * Prohibido importar infraestructura real (ADR-09, regla application-no-infra).
 */
export type { ActorContext, ActorKind } from "./authorization/actor-context.js";
export { createActorContext } from "./authorization/actor-context.js";

export type { UseCaseError, UseCaseErrorCode } from "./errors/use-case-error.js";
export { useCaseError } from "./errors/use-case-error.js";

export type { ContactMutationOperation, ContactRepositoryPort } from "./ports/contact-repository.port.js";
export type {
  ContactListPage,
  ContactQueryPort,
  ContactSummaryDTO,
  ListContactsQuery,
} from "./ports/contact-query.port.js";
export type {
  ContactProviderPort,
  PushUpdateResult,
  RemoteContactDTO,
  RemoteContactPage,
} from "./ports/contact-provider.port.js";
export type { OutboxEvent, OutboxEventType, OutboxPort } from "./ports/outbox.port.js";
export type { LlmCompletionRequest, LlmCompletionResult, LlmPort } from "./ports/llm.port.js";
export type { EmbeddingPort } from "./ports/embedding.port.js";

export type {
  CrearContactoCommand,
  CrearContactoOutput,
  EmailInput,
  PhoneInput,
} from "./use-cases/crear-contacto.js";
export { CrearContacto } from "./use-cases/crear-contacto.js";
