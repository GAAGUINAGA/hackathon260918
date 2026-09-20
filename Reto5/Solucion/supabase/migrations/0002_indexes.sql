-- 0002_indexes.sql
-- Índices de soporte para las consultas del pipeline.

create index if not exists idx_documents_sha256 on documents (sha256);
create index if not exists idx_documents_estado_ingesta on documents (estado_ingesta);
create index if not exists idx_clasificaciones_categoria on clasificaciones (categoria);
create index if not exists idx_metadatos_fecha_documento on metadatos (fecha_documento);
create index if not exists idx_audit_log_doc_id_timestamp on audit_log (doc_id, timestamp);
