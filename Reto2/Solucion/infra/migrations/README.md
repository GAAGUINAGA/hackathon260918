# infra/migrations

Migraciones versionadas de Drizzle ORM para las 16 tablas activas
(planeacion_v.2.1.2 §ADR-02, §ADR-03). Generadas desde
`packages/infrastructure/src/db/schema/` con `pnpm --filter @ssot/infrastructure run db:generate`;
aplicadas con `db:migrate` (equivalente a `drizzle-kit migrate`).

- `0000_*.sql` — las 16 tablas, generada por Drizzle desde el esquema
  TypeScript: `state boolean NOT NULL DEFAULT true` en las 14 tablas
  sujetas a ADR-21, índices únicos parciales `WHERE state` (RT-16).
- `0001_rls_extensions_outbox_trigger.sql` — escrita a mano (Drizzle no
  expresa RLS ni triggers): `pg_trgm`/`unaccent`, columna generada
  `search_vector` (UC-11), disparador `NOTIFY` del Outbox (RT-04 §4.2), y
  RLS `FORCE` + `WITH CHECK` en las 16 tablas (ADR-04, RT-01, RT-13, RT-15)
  más el privilegio mínimo de `app_rw` (ADR-11).
- `0002_outbox_relay_role_policy.sql` — política y `GRANT` para el rol
  `app_relay` (ver `infra/roles/002_create_app_relay.sql`), acotada
  exclusivamente a la tabla `outbox`.

**RLS y `SET LOCAL`.** Toda transacción de escritura o lectura acotada por
propietario debe fijar `app.current_user_id` (via `set_config(..., true)`,
nunca interpolando el valor) — ver `withOwnerTransaction` en
`packages/infrastructure/src/db/transaction.ts`. Postgres reevalúa el
`USING` de la política (no solo `WITH CHECK`) contra la fila nueva cuando
un `UPDATE` lleva `WHERE` y `USING` referencia una columna que cambia; por
eso las escrituras activan también el opt-in `app.include_retired`, no solo
la papelera (UC-21) — detalle documentado en el propio helper y verificado
en `packages/infrastructure/test/integration/rls.integration.spec.ts`.
