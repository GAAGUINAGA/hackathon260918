# ADR-019: Fallback automático a SQLite WAL

## Contexto
Si Postgres local o la Supabase CLI fallan en CI, el pipeline completo no debe colapsar.

## Decisión
Los tests de persistencia se parametrizan por `RETO5_PERSISTENCE`. El job `tests`
corre siempre con SQLite WAL. El job `supabase-integration` es aislado y no bloquea.

## Consecuencias
CI robusto ante fallos de infraestructura. Se requiere que los adaptadores
compartan contrato (`MetadataRepoPort`, `StoragePort`).
