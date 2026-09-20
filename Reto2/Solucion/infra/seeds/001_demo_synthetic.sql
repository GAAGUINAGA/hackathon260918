-- Fase 6: datos estrictamente sintéticos para una demostración local.
-- No contiene PII, secretos, tokens ni cuentas de proveedores. Es idempotente
-- y debe ejecutarse SOLO contra una base local ya migrada.
BEGIN;

INSERT INTO user_preferences (user_id, region, language, timezone)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'EC', 'es', 'America/Guayaquil'),
  ('22222222-2222-4222-8222-222222222222', 'CO', 'es', 'America/Bogota')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO contacts (id, owner_id, display_name, company, title, notes)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Ada Demo', 'Ejemplo Labs', 'Ingeniera de datos', 'Contacto ficticio para demostración.'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 'Bruno Demo', 'Ejemplo Labs', 'Analista', 'Segundo contacto ficticio.'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '22222222-2222-4222-8222-222222222222', 'Carla Demo', 'Datos de Prueba S.A.', 'Producto', 'Propietario aislado para validar RLS.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO contact_emails (id, contact_id, owner_id, value, local_part, domain, email_local_key, email_domain_key, is_principal)
VALUES
  ('e0000001-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'ada.demo@example.test', 'ada.demo', 'example.test', 'ada.demo', 'example.test', true),
  ('e0000002-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 'bruno.demo@example.test', 'bruno.demo', 'example.test', 'bruno.demo', 'example.test', true),
  ('e0000003-0000-4000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '22222222-2222-4222-8222-222222222222', 'carla.demo@example.test', 'carla.demo', 'example.test', 'carla.demo', 'example.test', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO contact_phones (id, contact_id, owner_id, raw_input, e164, is_normalized, is_principal)
VALUES
  ('f0000001-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', '+593990000001', '+593990000001', true, true),
  ('f0000002-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', '+593990000002', '+593990000002', true, true),
  ('f0000003-0000-4000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '22222222-2222-4222-8222-222222222222', '+573000000001', '+573000000001', true, true)
ON CONFLICT (id) DO NOTHING;

COMMIT;
