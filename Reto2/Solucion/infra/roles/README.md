# infra/roles

Scripts SQL de bootstrap de roles de base de datos, ejecutados una sola vez
por Postgres via `docker-entrypoint-initdb.d` al crear el volumen (ANTES de
que existan las tablas — por eso las políticas RLS y los `GRANT`
dependientes del esquema viven en `infra/migrations`, no aquí).

- `001_create_app_rw.sql` — rol de la aplicación (ADR-04, ADR-11, RT-13):
  el único con el que se conectan `apps/api` y `apps/worker`. Nunca
  `service_role` ni propietario de las tablas.
- `002_create_app_relay.sql` — rol del relé del Outbox (RT-04 §4.2): un
  lote abarca muchos propietarios a la vez, algo que la política de
  `app_rw` bloquea por diseño. Sin `BYPASSRLS`; su alcance se acota por una
  política propia en `outbox` únicamente (migración `0002`).

Las contraseñas son placeholders de desarrollo documentados en el propio
script; cualquier entorno real las sobreescribe fuera de este repositorio.
