# SSOT Contacts — Reto 2

Plataforma de Centralización de Contactos. Ver `.claude/planeacion_v.2.1.2.md`
(arquitectura) y `.claude/cdu_v.1.1.1.md` (casos de uso) para la
especificación completa. El flujo de desarrollo/auditoría está en
`.claude/CLAUDE.md`.

## Constitución técnica

La plataforma se rige por estos acuerdos no negociables:

1. **Fuente única de verdad.** PostgreSQL es el registro canónico de contactos;
   proveedores externos son fuentes sincronizables, no dueños de los datos.
2. **Arquitectura hexagonal.** Dominio, aplicación, infraestructura e interfaz
   se mantienen separados y `dependency-cruiser` vigila que no haya dependencias
   hacia adentro.
3. **Aislamiento por propietario.** El `owner_id` procede únicamente del JWT
   validado; RLS `FORCE` y `WITH CHECK` son la segunda línea de defensa.
4. **Validación en fronteras.** Value Objects, esquemas Zod y DTOs limpios
   impiden que datos inválidos o campos no expuestos crucen las capas.
5. **Seguridad por defecto.** Sin SQL interpolado, tokens OAuth cifrados con
   AES-256-GCM, errores sanitizados, rate limit, JWT contra JWKS y análisis de
   secretos/SAST en CI.
6. **Consistencia transaccional.** Las mutaciones y eventos Outbox ocurren en
   el mismo `COMMIT`; el relé usa `LISTEN/NOTIFY` y sondeo adaptativo.
7. **Contrato primero.** OpenAPI se genera desde la API y alimenta los clientes
   React y Flutter.
8. **Accesibilidad como terminado.** Web cumple WCAG 2.1 AA y móvil usa
   semántica nativa, con pruebas automatizadas.
9. **Datos de demostración seguros.** Los seeds son sintéticos, reproducibles e
   idempotentes; nunca incluyen PII, tokens ni secretos.
10. **IA diferida.** La Fase 7 es aditiva: el producto actual no necesita IA
    para funcionar ni para demostrar su núcleo determinista.

## Características y entregables por fase

| Fase | Estado | Entregables |
| --- | --- | --- |
| 0 — Entorno | Cerrada | Monorepo pnpm, Docker Compose (PostgreSQL/Redis), TypeScript estricto, ESLint, Semgrep, Gitleaks, dependency-cruiser y CI. |
| 1 — Dominio | Cerrada | Value Objects de email/teléfono, normalización NFKC/unaccent/E.164, agregado Contact y deduplicación determinista B1–B4. |
| 2 — Aplicación | Cerrada | `ActorContext`, puertos de repositorio/consulta/proveedor/Outbox, caso de uso Crear contacto y dobles en memoria. |
| 3 — Infraestructura | Cerrada | 16 tablas y migraciones Drizzle, RLS, roles mínimos, cifrado AES-GCM, Outbox transaccional y adaptador Google People. |
| 4 — API | Cerrada | NestJS/Fastify, REST, WebSocket autenticado, JWT/JWKS de Supabase, rate limit, validación Zod, DTOs seguros y e2e. |
| 5 — Clientes | Cerrada | Consola React/Vite accesible, cliente Flutter, clientes OpenAPI generados y pruebas de accesibilidad. |
| 6 — Seguridad y demo | Cerrada | Seeds sintéticos idempotentes, controles SSRF/CSV, modelo de amenazas y pruebas de integración estabilizadas. |
| 7 — IA | Diferida | Sin implementar deliberadamente: pgvector, embeddings, LLM y sugerencias semánticas no son necesarios para operar el producto. |

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

**Fase 3 — Anillo 2 (Infraestructura y persistencia).** Cerrada. `packages/infrastructure` implementa:
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

**Fase 4 — Anillo 3 (Interfaz de red y API).** Cerrada. `apps/api` y `apps/worker` implementan:
- `apps/api`: NestJS + Fastify. `JwtAuthGuard` verifica cada petición contra
  el JWKS de Supabase (ADR-05, RT-12, caché + rotación via `jose`), deriva
  `owner_id` solo del claim `sub` (RT-01), aprovisiona `user_preferences` en
  la primera petición (UC-08) y soporta `@RequireMfa()` (`aal2`, UC-09,
  declarado sin ruta consumidora aún).
- `ContactsController` (UC-01/UC-11/UC-12): validación de frontera con zod
  (RT-02), respuestas limpias vía `ClassSerializerInterceptor` con
  `excludeExtraneousValues` (excludeAll), 404 uniforme para inexistente/ajeno/
  retirado (nunca 403, UC-12).
- Rate limiting global (`@nestjs/throttler`, RT-09) y filtro de excepciones
  que nunca expone trazas internas al cliente (RT-07).
- `SyncProgressGateway`: WebSocket (Socket.IO) autenticado en el handshake
  (ADR-06), agrupado por sala de propietario, con `RedisIoAdapter` (ADR-06:
  "adaptador Redis") — verificado arrancando la API real contra el Redis de
  `docker-compose` y confirmando las conexiones `ioredis` en `CLIENT LIST`.
- `apps/worker`: `OutboxRelayService` arranca/detiene el `OutboxRelay` de
  Fase 3 dentro del ciclo de vida de Nest (`onModuleInit`/`onModuleDestroy`).
- Probado end-to-end contra Postgres real (`apps/api/test/e2e/`): JWT firmado
  con un JWKS local (sin credenciales reales), aislamiento por `owner_id`,
  400/404 del dominio, `excludeAll` y rate limiting.

**Fase 5 — Anillo 4 (Clientes).** Cerrada. React/Vite y Flutter consumen el
contrato OpenAPI generado, con pruebas de accesibilidad en sus pantallas de
contactos.

**Fase 6 — Endurecimiento, seguridad y demostración.** Cerrada. Incluye seeds
sintéticos reproducibles, controles probados contra SSRF e inyección de
fórmulas CSV, y el [modelo de amenazas](docs/threat-model.md).

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

# Pruebas e2e de apps/api (mismo Postgres; el JWT se firma con un JWKS local
# de prueba, no requiere un proyecto Supabase real)
pnpm --filter @ssot/api run test:e2e

# Datos de demostración locales, después de migrar (nunca en producción)
psql "$DATABASE_ADMIN_URL" -v ON_ERROR_STOP=1 -f infra/seeds/001_demo_synthetic.sql

# Levantar la API localmente sí requiere un proyecto Supabase real
# (SUPABASE_JWKS_URL/SUPABASE_ISSUER en infra/.env) — ver infra/.env.example.
```

## Instalación y ejecución local

### Dependencias

- Node.js 22 o superior y Corepack (para pnpm 12).
- Docker Desktop (PostgreSQL 16 y Redis 7 se ejecutan en contenedores).
- Flutter estable, solo para compilar/probar el cliente móvil.
- Un proyecto Supabase, solo para iniciar sesión y usar la aplicación web de
  forma manual. Las pruebas automatizadas no requieren uno.

### 1. Preparar el entorno

En PowerShell, desde `Reto2/Solucion`:

```powershell
corepack enable
pnpm install --frozen-lockfile
Copy-Item infra\.env.example infra\.env
Copy-Item apps\web\.env.example apps\web\.env.local
```

En `infra\.env`, conserva el mismo puerto en `POSTGRES_PORT` y en las tres
URLs de PostgreSQL. Por ejemplo, si Docker usa el puerto `5433`:

```env
POSTGRES_PORT=5433
DATABASE_URL=postgresql://app_rw:app_rw_local_dev_change_me@localhost:5433/ssot_contacts
DATABASE_ADMIN_URL=postgresql://ssot_admin:ssot_local_dev@localhost:5433/ssot_contacts
RELAY_DATABASE_URL=postgresql://app_relay:app_relay_local_dev_change_me@localhost:5433/ssot_contacts
```

Levanta servicios y aplica el esquema:

```powershell
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d

# Drizzle no lee infra/.env automáticamente: expone esta URL en la terminal.
$env:DATABASE_ADMIN_URL="postgresql://ssot_admin:ssot_local_dev@localhost:5433/ssot_contacts"
pnpm --filter @ssot/infrastructure run db:migrate
```

Si mantuviste el puerto `5432`, cambia `5433` por `5432` en el último comando.

### 2. Probar el proyecto automáticamente

```powershell
pnpm run lint
pnpm run build
pnpm run typecheck
pnpm run dep-cruise
pnpm run test
pnpm --filter @ssot/infrastructure run test:integration
pnpm --filter @ssot/api run test:e2e

Set-Location apps\mobile
flutter analyze
flutter test
```

### 3. Usar la aplicación web como usuario

1. Crea un proyecto Supabase y un usuario de email/contraseña en
   **Authentication → Users**.
2. Completa `apps\web\.env.local`:

   ```env
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=TU_CLAVE_ANON
   VITE_API_BASE_URL=http://localhost:3000
   ```

3. Completa en `infra\.env` `SUPABASE_JWKS_URL`, `SUPABASE_ISSUER` y
   `SUPABASE_AUDIENCE=authenticated` con los valores de ese proyecto.
4. Carga las variables de `infra\.env`, compila e inicia la API:

   ```powershell
   Set-Location C:\Proyectos\Hackathon\Reto2\Solucion
   Get-Content infra\.env | ForEach-Object {
     if ($_ -match '^\s*([^#=]+)=(.*)$') {
       Set-Item -Path "Env:$($matches[1].Trim())" -Value $matches[2].Trim()
     }
   }
   pnpm run build
   node apps\api\dist\main.js
   ```

5. En otra terminal, inicia la web y abre la URL indicada, normalmente
   `http://localhost:5173`:

   ```powershell
   Set-Location C:\Proyectos\Hackathon\Reto2\Solucion
   pnpm --filter @ssot/web run dev
   ```

Inicia sesión, crea un contacto y consulta su detalle. Los seeds de
`infra/seeds/` sirven para pruebas de base de datos: por RLS, un usuario real
de Supabase no verá los contactos de los UUID ficticios.

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
