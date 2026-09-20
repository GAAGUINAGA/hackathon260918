# ADR-014: `FileLockPort` y `MetadataRepoPort` como puertos

## Contexto
El locking de archivos difiere por plataforma (Windows/POSIX) y el repositorio de
metadatos debe poder migrar de SQLite a PostgreSQL sin tocar el dominio.

## Decisión
`FileLockPort` y `MetadataRepoPort` se definen como `Protocol` en `ports/`; los
adaptadores concretos (`PlatformFileLock`, `SQLiteMetadataRepo`,
`SupabaseMetadataRepo`) implementan el contrato sin que `application/` ni
`domain/` conozcan la implementación.

## Consecuencias
Portabilidad cross-platform y hacia PostgreSQL/Supabase (ver ADR-017) sin
reescribir casos de uso. Añade una capa de indirección que debe respetarse en
todo nuevo adaptador.
