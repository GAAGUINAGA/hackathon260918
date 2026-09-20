-- 0001_init.sql
-- Esquema inicial: documentos, extracción, clasificación, metadatos, nombres, auditoría, duplicados.

create table if not exists documents (
    id uuid primary key default gen_random_uuid(),
    sha256 text not null unique,
    ruta_original text not null,
    mime text not null,
    tamano_bytes bigint not null,
    estado_ingesta text not null default 'pendiente',
    timestamp_ingesta timestamptz not null default now()
);

create table if not exists textos_extraidos (
    doc_id uuid primary key references documents (id) on delete cascade,
    texto text,
    metodo text not null,
    idioma text,
    calidad real,
    resumen_denso text,
    chunks jsonb not null default '[]'::jsonb
);

create table if not exists clasificaciones (
    doc_id uuid primary key references documents (id) on delete cascade,
    categoria text not null,
    tipo text,
    etiquetas jsonb not null default '[]'::jsonb,
    confianza real not null,
    metodo text not null,
    evidencia jsonb not null default '{}'::jsonb
);

create table if not exists metadatos (
    doc_id uuid primary key references documents (id) on delete cascade,
    fecha_documento date,
    entidad_emisora text,
    entidad_receptora text,
    persona_relacionada text,
    identificador text,
    version int,
    confianza_global real not null default 0,
    evidencia jsonb not null default '{}'::jsonb
);

create table if not exists nombres (
    doc_id uuid primary key references documents (id) on delete cascade,
    nombre_final text not null,
    ruta_logica_final text not null,
    estado_publicacion text not null default 'pendiente'
);

create table if not exists audit_log (
    id uuid primary key default gen_random_uuid(),
    doc_id uuid not null references documents (id) on delete cascade,
    etapa text not null,
    decision text not null,
    metodo text,
    tokens_llm int,
    chunks_usados int,
    timestamp timestamptz not null default now()
);

create table if not exists duplicados (
    sha256 text not null,
    doc_original_id uuid not null references documents (id) on delete cascade,
    doc_duplicado_id uuid not null references documents (id) on delete cascade,
    timestamp timestamptz not null default now(),
    primary key (sha256, doc_duplicado_id)
);

-- RLS: habilitado en todas las tablas (v1 monousuario opera vía service_role desde backend local).
alter table documents enable row level security;
alter table textos_extraidos enable row level security;
alter table clasificaciones enable row level security;
alter table metadatos enable row level security;
alter table nombres enable row level security;
alter table audit_log enable row level security;
alter table duplicados enable row level security;

create policy "service_role_full_access_documents" on documents
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_textos_extraidos" on textos_extraidos
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_clasificaciones" on clasificaciones
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_metadatos" on metadatos
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_nombres" on nombres
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_audit_log" on audit_log
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_duplicados" on duplicados
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
