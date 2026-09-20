# ADR-012: SQLite WAL + escritor único + lectores RO

## Contexto
La UI (Streamlit/CLI) y los workers de ingesta leen/escriben `auditoria.db`
simultáneamente. El modo `journal_mode=DELETE` por defecto bloquea toda la BD
durante escrituras → `database is locked`.

## Decisión
`journal_mode=WAL` con PRAGMAs (`synchronous=NORMAL`, `busy_timeout=5000`,
`foreign_keys=ON`, etc.), un único `WriterThread` que serializa escrituras en
batch, y conexiones de solo lectura (`?mode=ro&uri=true`) para UI/CLI/reportes.

## Consecuencias
Elimina `database is locked` en operación normal (requisito no funcional: cero
errores). Requiere disciplina: ninguna escritura fuera del `WriterThread`.
