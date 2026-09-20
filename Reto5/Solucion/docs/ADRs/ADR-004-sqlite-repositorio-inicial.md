# ADR-004: SQLite como repositorio inicial

## Contexto
El alcance v1 es local y monousuario; un motor de base de datos con servidor propio
sería sobreingeniería para este caso.

## Decisión
SQLite en modo WAL como persistencia por defecto (ver ADR-012 para el diseño de
concurrencia). Portable a PostgreSQL/Supabase sin cambios de dominio (ver ADR-017).

## Consecuencias
Cero configuración, cero dependencias externas para desarrollo y demo. La migración
a Postgres solo cambia el adaptador (`MetadataRepoPort`), no el pipeline.
