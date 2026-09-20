# Arquitectura — Reto 5

Arquitectura por capas con puertos y adaptadores (hexagonal), local-first,
portable a Supabase sin reescribir el core.

```
interfaces/   CLI (Typer), UI (Streamlit), API (FastAPI, opcional)
application/  Casos de uso (orquestan dominio + puertos)
domain/       Entidades, errores, reglas de negocio puras
ports/        Protocolos (LLMPort, OCRPort, NLPPort, ChunkerPort,
              MetadataRepoPort, StoragePort)
adapters/
  local/      SQLite WAL, filesystem local, Tesseract/PaddleOCR, Ollama
  cloud/      Supabase (Postgres + Storage), OpenAI/Anthropic/Gemini
```

Regla: `application/` y `domain/` dependen solo de `ports/`, nunca de un
adaptador concreto. El modo de ejecución (`RETO5_PERSISTENCE=sqlite |
supabase-local | supabase-cloud`) decide qué adaptador se inyecta; el
pipeline no cambia.

Puertos añadidos en Fase 0 (los que requieren las fixtures obligatorias de
`.claude/CLAUDE.md` §7.3): `LLMPort`, `OCRPort`, `NLPPort`, `ChunkerPort`,
`MetadataRepoPort`, `StoragePort`. Puertos definidos en `planeacion_v2.0.1.md`
§0.6 y pendientes de implementar en Fase 1: `IngestPort`, `FileLockPort`,
`TextExtractorPort`, `ClassifierPort`, `NamingPort`.

## Pendiente de resolver al iniciar Fase 1

`planeacion_v2.0.1.md` §0.12 define `estado_ingesta` y `estado_publicacion`
como `Literal` acotados, pero `cdu_v1.0.1.md` (UC-01, UC-06) usa un vocabulario
más amplio (`ENCOLADO`, `CUARENTENA`, `BLOQUEADO`, `CORRUPTO`, `DESCARTADO`,
`DUPLICADO`, `CIFRADO` / `FALLO_COPIA`, `FALLO_RENAME`, `FALLO_LIMPIEZA`,
`FALLO_PERMISO`, `FALLO_DISCO`). Antes de codificar `DocumentoRaw` y
`DocumentoProcesado` en `domain/`, unificar ambos vocabularios en un único
`Enum` por campo que cubra todos los flujos alternativos del CDU, y enriquecer
`DocumentoProcesado` con `resumen_denso`, `chunks[]` y `evidencia` (RN-20).

Ver `docs/ADRs/` para las decisiones registradas, `docs/planeacion_v2.0.1.md`
y `docs/CDU_v1.0.1.md` para el diseño completo.
