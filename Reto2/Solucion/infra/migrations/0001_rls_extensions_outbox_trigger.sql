-- =============================================================================
-- Fase 3 (Anillo 2). Todo lo que el DSL de Drizzle no expresa: RLS FORCE +
-- WITH CHECK (ADR-04, RT-01, RT-13), extensiones de busqueda, indice de
-- deteccion de duplicados por nombre (B3), disparador del Outbox (RT-04) y
-- privilegio minimo del rol app_rw (ADR-11).
--
-- Convencion de sesion (usada por infraestructura en cada transaccion):
--   SET LOCAL app.current_user_id = '<uuid del owner verificado>';
--   SET LOCAL app.include_retired = 'true';  -- solo dentro de UC-21 (papelera)
-- Sin la primera, current_setting(..., true) devuelve NULL (o, en una
-- conexion pooled que ya uso este GUC antes y volvio a su valor por
-- defecto, '') y toda comparacion de propietario es NULL (falsy): cero
-- filas, nunca fuga. El cast a uuid se envuelve en NULLIF(..., '') para que
-- ese '' no reviente con un error de casteo en vez de fallar cerrado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensiones (planeacion_v.2.1.2 - Busqueda: tsvector + GIN + pg_trgm + unaccent)
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() es STABLE, no IMMUTABLE: Postgres no permite usarla directamente
-- en una columna generada. Se envuelve en una funcion IMMUTABLE con el
-- diccionario fijo, unico uso que necesitamos aqui.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT unaccent('unaccent', $1)
$$;

-- -----------------------------------------------------------------------------
-- Busqueda sobre contacts (UC-11): tsvector generado + GIN, y trigram sobre
-- el nombre para similitud aproximada (B3, UC-03).
-- -----------------------------------------------------------------------------
ALTER TABLE "contacts"
  ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      immutable_unaccent(
        coalesce("display_name", '') || ' ' ||
        coalesce("company", '') || ' ' ||
        coalesce("title", '') || ' ' ||
        coalesce("notes", '')
      )
    )
  ) STORED;

CREATE INDEX "contacts_search_vector_idx" ON "contacts" USING gin ("search_vector");
CREATE INDEX "contacts_display_name_trgm_idx" ON "contacts" USING gin ("display_name" gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Rele del Outbox (RT-04 S4.2): notificacion activa. El payload de NOTIFY es
-- solo el id (senal de despertar); el rele siempre relee la fila, que es la
-- fuente de verdad. El sondeo adaptativo de respaldo vive en el rele
-- (apps/worker, Fase 4), no en la base de datos.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_outbox() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify('outbox_channel', NEW.id::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER "outbox_notify_trigger"
AFTER INSERT ON "outbox"
FOR EACH ROW
EXECUTE FUNCTION notify_outbox();

-- -----------------------------------------------------------------------------
-- Row Level Security: FORCE + WITH CHECK en las 16 tablas (ADR-04, RT-01,
-- RT-13, RT-15). USING filtra por owner_id y, en las 14 tablas sujetas a
-- ADR-21, tambien por state (con opt-in por transaccion). WITH CHECK solo
-- valida el propietario: una transicion de state (p. ej. retirar) debe poder
-- escribirse aunque la fila deje de cumplir el USING de lectura por defecto.
-- -----------------------------------------------------------------------------

-- user_preferences: user_id hace de propietario (PK = auth.users.id).
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_preferences" FORCE ROW LEVEL SECURITY;
CREATE POLICY "user_preferences_owner_isolation" ON "user_preferences"
  USING (
    "user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND ("state" = true OR current_setting('app.include_retired', true) = 'true')
  )
  WITH CHECK ("user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- contacts
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contacts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "contacts_owner_isolation" ON "contacts"
  USING (
    "owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND ("state" = true OR current_setting('app.include_retired', true) = 'true')
  )
  WITH CHECK ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- contact_emails
ALTER TABLE "contact_emails" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_emails" FORCE ROW LEVEL SECURITY;
CREATE POLICY "contact_emails_owner_isolation" ON "contact_emails"
  USING (
    "owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND ("state" = true OR current_setting('app.include_retired', true) = 'true')
  )
  WITH CHECK ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- contact_phones
ALTER TABLE "contact_phones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_phones" FORCE ROW LEVEL SECURITY;
CREATE POLICY "contact_phones_owner_isolation" ON "contact_phones"
  USING (
    "owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND ("state" = true OR current_setting('app.include_retired', true) = 'true')
  )
  WITH CHECK ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- contact_addresses
ALTER TABLE "contact_addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_addresses" FORCE ROW LEVEL SECURITY;
CREATE POLICY "contact_addresses_owner_isolation" ON "contact_addresses"
  USING (
    "owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND ("state" = true OR current_setting('app.include_retired', true) = 'true')
  )
  WITH CHECK ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- tags
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tags" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tags_owner_isolation" ON "tags"
  USING (
    "owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND ("state" = true OR current_setting('app.include_retired', true) = 'true')
  )
  WITH CHECK ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- categories
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY "categories_owner_isolation" ON "categories"
  USING (
    "owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND ("state" = true OR current_setting('app.include_retired', true) = 'true')
  )
  WITH CHECK ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- contact_tag_links
ALTER TABLE "contact_tag_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_tag_links" FORCE ROW LEVEL SECURITY;
CREATE POLICY "contact_tag_links_owner_isolation" ON "contact_tag_links"
  USING (
    "owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND ("state" = true OR current_setting('app.include_retired', true) = 'true')
  )
  WITH CHECK ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- contact_category_links
ALTER TABLE "contact_category_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_category_links" FORCE ROW LEVEL SECURITY;
CREATE POLICY "contact_category_links_owner_isolation" ON "contact_category_links"
  USING (
    "owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND ("state" = true OR current_setting('app.include_retired', true) = 'true')
  )
  WITH CHECK ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- integration_accounts
ALTER TABLE "integration_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integration_accounts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "integration_accounts_owner_isolation" ON "integration_accounts"
  USING (
    "owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND ("state" = true OR current_setting('app.include_retired', true) = 'true')
  )
  WITH CHECK ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- contact_links
ALTER TABLE "contact_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_links" FORCE ROW LEVEL SECURITY;
CREATE POLICY "contact_links_owner_isolation" ON "contact_links"
  USING (
    "owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND ("state" = true OR current_setting('app.include_retired', true) = 'true')
  )
  WITH CHECK ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- duplicate_candidates
ALTER TABLE "duplicate_candidates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "duplicate_candidates" FORCE ROW LEVEL SECURITY;
CREATE POLICY "duplicate_candidates_owner_isolation" ON "duplicate_candidates"
  USING (
    "owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND ("state" = true OR current_setting('app.include_retired', true) = 'true')
  )
  WITH CHECK ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- merge_operations
ALTER TABLE "merge_operations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "merge_operations" FORCE ROW LEVEL SECURITY;
CREATE POLICY "merge_operations_owner_isolation" ON "merge_operations"
  USING (
    "owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND ("state" = true OR current_setting('app.include_retired', true) = 'true')
  )
  WITH CHECK ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- jobs
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jobs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "jobs_owner_isolation" ON "jobs"
  USING (
    "owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND ("state" = true OR current_setting('app.include_retired', true) = 'true')
  )
  WITH CHECK ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- contact_revisions: exenta de ADR-21 (RT-10), sin filtro de state.
ALTER TABLE "contact_revisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_revisions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "contact_revisions_owner_isolation" ON "contact_revisions"
  USING ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- outbox: exenta de ADR-21 (infraestructura transitoria), sin filtro de state.
ALTER TABLE "outbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outbox" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outbox_owner_isolation" ON "outbox"
  USING ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK ("owner_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- -----------------------------------------------------------------------------
-- Privilegio minimo (ADR-04, ADR-11, RT-13): app_rw es el unico rol con el
-- que se conecta la aplicacion, nunca service_role ni el propietario.
-- -----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;

GRANT USAGE ON SCHEMA public TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rw;

-- RT-10: contact_revisions no admite UPDATE ni DELETE. Se revoca a nivel de
-- rol, no solo por disciplina de aplicacion.
REVOKE UPDATE, DELETE ON "contact_revisions" FROM app_rw;
