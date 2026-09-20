-- RT-04 §4.2: el rele reclama lotes de "outbox" que abarcan muchos
-- propietarios a la vez (SELECT ... FOR UPDATE SKIP LOCKED), así que no
-- puede operar bajo el aislamiento por owner_id de app_rw. app_relay
-- recibe una politica propia, acotada EXCLUSIVAMENTE a esta tabla
-- (privilegio minimo: no toca contact_revisions, contacts ni ninguna otra).
-- DELETE incluido: app_relay tambien purga por antiguedad las filas ya
-- procesadas (RT-04 §4.2: "outbox... se purga fisicamente por antiguedad").
GRANT USAGE ON SCHEMA public TO app_relay;
GRANT SELECT, UPDATE, DELETE ON "outbox" TO app_relay;

CREATE POLICY "outbox_relay_full_access" ON "outbox"
  FOR ALL
  TO app_relay
  USING (true)
  WITH CHECK (true);
