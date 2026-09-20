# ADRs — Reto 5

| ADR | Decisión |
|---|---|
| [001](ADR-001-local-first-monousuario.md) | Local-first monousuario |
| [002](ADR-002-arquitectura-puertos-adaptadores.md) | Arquitectura por capas con puertos/adaptadores |
| [003](ADR-003-pipeline-hibrido.md) | Pipeline híbrido (reglas + NLP + embeddings + LLM) |
| [004](ADR-004-sqlite-repositorio-inicial.md) | SQLite como repositorio inicial |
| [005](ADR-005-ocr-tesseract-paddleocr.md) | OCR con Tesseract + PaddleOCR |
| [006](ADR-006-llm-local-por-defecto.md) | LLM local por defecto (Ollama) |
| [007](ADR-007-convencion-de-nombres.md) | Convención de nombres `YYYY-MM-DD_CAT_TIPO_ENTIDAD_ID_vNN` |
| [008](ADR-008-umbral-confianza-pendientes.md) | Umbral de confianza → `_Pendientes` |
| [009](ADR-009-auditoria-obligatoria.md) | Auditoría obligatoria por documento |
| [010](ADR-010-configuracion-externa-yaml.md) | Configuración externa en YAML |
| [011](ADR-011-file-locking-5-capas.md) | File locking en 5 capas |
| [012](ADR-012-sqlite-wal-escritor-unico.md) | SQLite WAL + escritor único + lectores RO |
| [013](ADR-013-patron-outbox.md) | Patrón outbox para mover archivos tras commit |
| [014](ADR-014-filelockport-metadatareporport.md) | `FileLockPort` y `MetadataRepoPort` como puertos |
| [015](ADR-015-atomicidad-cross-partition.md) | Atomicidad cross-partition (Copy-and-Delete) |
| [016](ADR-016-chunking-resumen-agregacion-votos.md) | Chunking + resumen denso + agregación de votos |
| [017](ADR-017-supabase-local-first.md) | Supabase local-first para desarrollo |
| [018](ADR-018-mocking-llm-ci.md) | Mocking obligatorio de LLMPort en CI |
| [019](ADR-019-fallback-sqlite.md) | Fallback automático a SQLite WAL |

ADR-001 a ADR-016: `planeacion_v2.0.1.md` §0.19 y `cdu_v1.0.1.md` §8.
ADR-017 a ADR-019: `.claude/CLAUDE.md` §15 (Fase 0, portabilidad Supabase).

Una decisión arquitectónica nueva se registra como `ADR-0NN-titulo-kebab.md` en el
momento en que se toma, no retroactivamente.
