import { beforeEach, describe, expect, it } from "vitest";
import { createActorContext } from "../../src/authorization/actor-context.js";
import { CrearContacto } from "../../src/use-cases/crear-contacto.js";
import { InMemoryContactRepository } from "../doubles/in-memory-contact-repository.js";
import { InMemoryOutbox } from "../doubles/in-memory-outbox.js";

describe("CrearContacto (UC-01)", () => {
  let repository: InMemoryContactRepository;
  let outbox: InMemoryOutbox;
  let useCase: CrearContacto;
  let nextId: number;

  beforeEach(() => {
    repository = new InMemoryContactRepository();
    outbox = new InMemoryOutbox();
    nextId = 0;
    useCase = new CrearContacto(repository, outbox, () => `contact-${++nextId}`);
  });

  it("crea el contacto, lo persiste con operation=create y devuelve id + versión 1", async () => {
    const actor = createActorContext("owner-1");

    const result = await useCase.execute(actor, { displayName: "Ana Pérez", emails: [{ raw: "ana@empresa.com" }] });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.version).toBe(1);
      const stored = await repository.findById(actor, result.value.contactId);
      expect(stored?.displayName).toBe("Ana Pérez");
    }
    expect(repository.savedOperations).toEqual(["create"]);
  });

  it("encola dedupe:scan en el Outbox tras crear, con el payload del contacto y propietario (UC-01, paso 5, RT-04)", async () => {
    const actor = createActorContext("owner-1");

    const result = await useCase.execute(actor, { displayName: "Ana" });

    expect(result.isOk()).toBe(true);
    expect(outbox.events).toHaveLength(1);
    expect(outbox.events[0]?.event.type).toBe("dedupe:scan");
    if (result.isOk()) {
      expect(outbox.events[0]?.event.payload).toEqual({ contactId: result.value.contactId, ownerId: "owner-1" });
    }
  });

  it("resuelve el ownerId siempre de ActorContext, nunca del comando (RT-01)", async () => {
    const actor = createActorContext("owner-1");

    const result = await useCase.execute(actor, { displayName: "Ana" });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const stored = await repository.findById(actor, result.value.contactId);
      expect(stored?.ownerId).toBe("owner-1");
      // Un actor de otro propietario no puede leer el contacto recién creado.
      const otherActor = createActorContext("owner-2");
      expect(await repository.findById(otherActor, result.value.contactId)).toBeNull();
    }
  });

  it("propaga el error de dominio sin persistir ni encolar nada (correo inválido)", async () => {
    const actor = createActorContext("owner-1");

    const result = await useCase.execute(actor, { emails: [{ raw: "no-es-un-correo" }] });

    expect(result.isErr()).toBe(true);
    expect(repository.savedOperations).toHaveLength(0);
    expect(outbox.events).toHaveLength(0);
  });

  it("propaga el error de dominio cuando no hay ningún identificador significativo (UC-01, flujo 3b)", async () => {
    const actor = createActorContext("owner-1");

    const result = await useCase.execute(actor, {});

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("contact_empty");
    }
  });

  it("normaliza el teléfono a E.164 usando la región del actor cuando falta prefijo (UC-01, paso 3)", async () => {
    const actor = createActorContext("owner-1");

    const result = await useCase.execute(actor, { phones: [{ raw: "0991234567", region: "EC" }] });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const stored = await repository.findById(actor, result.value.contactId);
      expect(stored?.phones[0]?.value.e164).toBe("+593991234567");
    }
  });
});
