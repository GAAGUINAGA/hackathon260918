# SSOT Contacts — Reto 2

Plataforma de Centralización de Contactos. Ver `.claude/planeacion_v.2.1.2.md`
(arquitectura) y `.claude/cdu_v.1.1.1.md` (casos de uso) para la
especificación completa. El flujo de desarrollo/auditoría está en
`.claude/CLAUDE.md`.

## Estado

**Fase 0 — Seteo del entorno.** Cerrada. Estructura de monorepo, tooling de
verificación (TypeScript estricto, ESLint, dependency-cruiser, gitleaks,
Semgrep) y CI configurados.

**Fase 1 — Anillo 0 (Dominio puro), en curso.** `packages/domain` implementa:
- `EmailAddress` / `PhoneNumber` (Value Objects, ADR-10, `Result<T,E>` vía `neverthrow`).
- Normalizaciones NFKC / unaccent / E.164 (`shared/text-normalization.ts`, `value-objects/calling-codes.ts`).
- Motor de puntuación de deduplicación determinista (`dedup/`), señales B1-B4
  (UC-03) incluyendo el dominio emparentado de ADR-18a
  (`value-objects/email-domain-relatedness.ts`), con la tabla de alias
  inyectada como dato puro (la real vive en infraestructura, Fase 3).
- Cero dependencias externas salvo `neverthrow`, verificado mecánicamente por
  `dependency-cruiser` (`domain-is-pure`, `domain-no-external-deps`,
  `no-llm-in-domain`).

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
docker compose -f infra/docker-compose.yml up -d

# Verificación (Nivel 0) — el orden importa: build antes de typecheck
pnpm run lint
pnpm run build      # emite dist/ de cada paquete
pnpm run typecheck  # los paquetes del workspace se resuelven via dist/, no via src/
pnpm run dep-cruise
pnpm run test       # vitest transpila TS on-the-fly; no depende de dist/
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
