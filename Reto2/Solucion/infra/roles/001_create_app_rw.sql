-- ADR-04, ADR-11, RT-13: la aplicacion se conecta como app_rw, nunca como
-- service_role ni como propietario de las tablas. Los GRANT concretos
-- (dependen de que las tablas ya existan) viven en la migracion
-- 0001_rls_extensions_outbox_trigger.sql, no aqui: este script corre una
-- sola vez, en la creacion del volumen de Postgres, antes de cualquier
-- migracion.
--
-- La contrasena de desarrollo es un placeholder deliberado: en cualquier
-- entorno real se sobreescribe (ALTER ROLE ... PASSWORD) fuera de este
-- repositorio, nunca se versiona una credencial productiva.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'app_rw') THEN
    CREATE ROLE app_rw LOGIN PASSWORD 'app_rw_local_dev_change_me';
  END IF;
END
$$;
