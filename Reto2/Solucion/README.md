# SSOT Contacts — Reto 2

Plataforma de Centralización de Contactos. Ver `.claude/planeacion_v.2.1.2.md`
(arquitectura) y `.claude/cdu_v.1.1.1.md` (casos de uso) para la
especificación completa. El flujo de desarrollo/auditoría está en
`.claude/CLAUDE.md`.

## Estado

**Fase 0 — Seteo del entorno.** Cerrada. Estructura de monorepo, tooling de
verificación (TypeScript estricto, ESLint, dependency-cruiser, gitleaks,
Semgrep) y CI configurados.

**Fase 1 — Anillo 0 (Dominio puro).** Cerrada. `packages/domain` implementa:
- `EmailAddress` / `PhoneNumber` (Value Objects, ADR-10, `Result<T,E>` vía `neverthrow`).
- Normalizaciones NFKC / unaccent / E.164 (`shared/text-normalization.ts`, `value-objects/calling-codes.ts`).
- Motor de puntuación de deduplicación determinista (`dedup/`), señales B1-B4
  (UC-03) incluyendo el dominio emparentado de ADR-18a
  (`value-objects/email-domain-relatedness.ts`), con la tabla de alias
  inyectada como dato puro (la real vive en infraestructura, Fase 3).
- `Contact` (agregado raíz, UC-01/UC-13): fábrica cerrada que exige al menos
  un identificador significativo y retiro lógico (`state`/`withdrawnAt`, RT-14).
- Cero dependencias externas salvo `neverthrow`, verificado mecánicamente por
  `dependency-cruiser` (`domain-is-pure`, `domain-no-external-deps`,
  `domain-no-node-core`, `no-llm-in-domain`).

**Fase 2 — Anillo 1 (Casos de uso y aplicación).** Cerrada. `packages/application` implementa:
- `ActorContext` (RT-01): `ownerId` resuelto siempre del contexto verificado,
  nunca de un parámetro suelto.
- Puertos de salida: `ContactRepositoryPort`, `ContactQueryPort` (un puerto
  por agregado, DTO planos, ADR-19a), `ContactProviderPort`, `OutboxPort`
  (RT-04). Puertos diferidos `LlmPort`/`EmbeddingPort` declarados sin
  adaptador (ADR-20).
- `CrearContacto` (UC-01) orquestando dominio + puertos, probado con dobles
  de prueba en memoria (`test/doubles/`), sin infraestructura real.
- `dependency-cruiser` extiende `application-no-external-deps` y
  `application-no-node-core`: el anillo 1 tampoco puede importar Node core
  ni paquetes npm arbitrarios (solo `@ssot/domain` + `neverthrow`).

**Fase 3 — Anillo 2 (Infraestructura y persistencia), en curso.** `packages/infrastructure` implementa:
- Esquema Drizzle de las 16 tablas activas (`src/db/schema/`) + migraciones
  en `infra/migrations/` (ver su README para el detalle de cada una).
- RLS `FORCE` + `WITH CHECK` en las 16 tablas, `SET LOCAL app.current_user_id`
  parametrizado por transacción (`withOwnerTransaction`), verificado con
  Postgres real en `test/integration/` — incluida la aislación cruzada de
  propietarios y el filtro de `state` con opt-in por transacción (RT-15).
- Cifrado AES-256-GCM de tokens de proveedor (`crypto/token-cipher.ts`), IV
  nunca reutilizado, autenticidad verificada (GCM detecta manipulación).
- Outbox transaccional: `DrizzleOutbox` (RT-04) + `OutboxRelay` (rol
  `app_relay` dedicado, `FOR UPDATE SKIP LOCKED`, sondeo adaptativo,
  `LISTEN/NOTIFY`). `withTransactionalContactWrites` compone
  `ContactRepositoryPort` + `OutboxPort` en una sola transacción —
  atomicidad de RT-04 probada contra Postgres real, incluido el caso de
  fallo con reversión total.
- `GooglePeopleAdapter` (`ContactProviderPort`, UC-05/UC-06, ADR-17):
  cliente HTTP inyectable, probado con respuestas simuladas (sin red ni
  credenciales reales).
- `ContactRepositoryPort`/`ContactQueryPort` implementados contra Postgres
  real, cerrando el anillo para UC-01.

**Ubicación del workflow de CI.** `Reto2/Solucion` es un subdirectorio de un
monorepo que aloja varios retos. GitHub Actions **solo** descubre workflows
en `.github/workflows/` de la **raíz real del repositorio**, no dentro de
este subdirectorio. El workflow de este reto vive en
[`../../.github/workflows/reto2-ci.yml`](../../.github/workflows/reto2-ci.yml)
(relativo a esta carpeta), acotado por `paths: Reto2/Solucion/**` para no
disparar en cambios de otros retos.

## Quickstart

```bash
corepack enable
pnpm install

# Infraestructura local (Postgres + Redis)
cp infra/.env.example infra/.env
# Si el 5432 local ya está ocupado (p. ej. un Postgres nativo instalado),
# cambia POSTGRES_PORT en infra/.env (y los *_URL) a otro puerto libre, p. ej. 5433.
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d
# app_rw y app_relay se crean solos via docker-entrypoint-initdb.d (infra/roles/)
# la primera vez que se crea el volumen.

# Migraciones (16 tablas + RLS + extensiones + disparador del Outbox)
pnpm --filter @ssot/infrastructure run db:migrate

# Verificación (Nivel 0) — el orden importa: build antes de typecheck
pnpm run lint
pnpm run build      # emite dist/ de cada paquete
pnpm run typecheck  # los paquetes del workspace se resuelven via dist/, no via src/
pnpm run dep-cruise
pnpm run test       # vitest transpila TS on-the-fly; no depende de dist/

# Pruebas de integración de infraestructura (requieren Postgres arriba y migrado)
pnpm --filter @ssot/infrastructure run test:integration
```

**Contrato de resolución de paquetes.** `main`/`types`/`exports` de cada
paquete de `packages/` apuntan a `./dist/*`, no a `./src/*`: es el mecanismo
único que usará también el runtime de Node en Fase 4 (`apps/api`/`apps/worker`
compilados), evitando dos vías de resolución contradictorias. Por eso
`pnpm run build` debe ejecutarse antes de `pnpm run typecheck` — el CI
(`reto2-ci.yml`) ya respeta este orden. `vitest` es la excepción deliberada:
transpila TypeScript en memoria y prueba siempre contra `src/`, sin pasar por
`dist/`.

## Estructura

```
apps/
  api/            Anillo 3 — NestJS + Fastify (HTTP + WebSocket)
  worker/         Anillo 3 — NestJS standalone (BullMQ + relé Outbox)
  web/            Anillo 4 — React + Vite (consola de administración)
  mobile/         Anillo 4 — Flutter (cliente de consumo)
packages/
  domain/         Anillo 0 — entidades, value objects, reglas puras
  application/    Anillo 1 — casos de uso, puertos, políticas
  infrastructure/ Anillo 2 — repositorios, adaptadores, cripto, colas
  contracts/      openapi.json y clientes generados
  design-tokens/  tokens JSON → CSS vars + ThemeData Dart
  a11y/           primitivos accesibles compartidos (web)
infra/            docker-compose, migraciones, roles SQL, seeds
prompts/          prompts de IA redactados, sin ejecución (Fase 7)
audits/           historial de auditorías independientes por fase
```

La construcción avanza de adentro hacia afuera (anillo 0 → 4). Ningún anillo
exterior se implementa antes de que el interior esté cerrado, probado y
auditado por un agente distinto del que lo construyó.
