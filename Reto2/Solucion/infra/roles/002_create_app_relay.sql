-- RT-04, RT-13: el rele del Outbox es un proceso de infraestructura sin
-- contexto de usuario -- procesa un lote que abarca muchos propietarios a
-- la vez, así que no puede operar bajo el aislamiento por owner_id de
-- app_rw. Recibe un rol propio, sin BYPASSRLS (privilegio amplio e
-- indiscriminado): la politica que lo autoriza (migracion 0002) lo acota
-- exclusivamente a la tabla outbox, nunca a datos de contactos.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'app_relay') THEN
    CREATE ROLE app_relay LOGIN PASSWORD 'app_relay_local_dev_change_me';
  END IF;
END
$$;
