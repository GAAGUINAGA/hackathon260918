# INFORME DE AUDITORÍA — Reto 5 — Fase 0

**fase:** 0
**fecha:** 2026-09-20
**ruta auditada:** `C:\Proyectos\Hackathon\.claude\worktrees\reto-5`
**estado del directorio auditado:** `Documentos/` (773 PDFs) + `Solucion/.claude/` (planeacion_v2.0.1.md, cdu_v1.0.1.md, CLAUDE.md). Sin código, sin tests, sin CI. No existe `.git` en el directorio (`git rev-parse --show-toplevel` resuelve al repo padre `Hackathon` en rama `RETO-2_BACKEND-CONTACTOS`).

**resumen_ejecutivo:** La capa de *diseño* de Fase 0 (arquitectura, taxonomía, convención, ADRs 001–019, estrategias de concurrencia/outbox/atomicidad/contexto) está correctamente especificada en `planeacion_v2.0.1.md` y `cdu_v1.0.1.md`. Sin embargo, la Fase 0 definida como *"Setteo del entorno"* en `CLAUDE.md` no se ha ejecutado en absoluto: no hay repositorio de trabajo, scaffold del proyecto, CI/CD, tests base ni mocking de LLM. La fase no es cerrable según los criterios de cierre.

**veredicto_global:** CON_HALLAZGOS

**conteo_hallazgos:** {"CRITICAL": 1, "HIGH": 3, "MEDIUM": 2, "LOW": 2}

## Hallazgos

---

### [CRITICAL] 1. Reto 5 sin control de versiones ni CI/CD: `reto-5` no es un worktree git y no existe `.github/workflows`

- **archivo_linea:** `C:\Proyectos\Hackathon\.claude\worktrees\reto-5` (raíz; ausencia de `.git`, `.github/workflows/ci.yml`, `.github/workflows/security.yml`)
- **defecto_funcional:** El directorio auditado no contiene un repositorio válido (carece de `.git`; `git worktree list` no lo registra y `git --show-toplevel` resuelve al repo padre en rama `RETO-2_BACKEND-CONTACTOS`). Todo el contenido (planos y corpus) vive como carpeta no versionada. Por tanto: no hay commits por fase (violación de Conventional Commits del §2.3), no hay rama `RETO-5_IA-CLASIFICACION` con histórico, y no existe ningún workflow de GitHub Actions. El criterio de cierre "CI verde (SQLite)" es incumplible y el flujo obligatorio CLAUDE→OpenCode→Commit→Push→CI no puede ejecutarse.
- **regla_violada:** CLAUDE.md §2.3 (flujo obligatorio), §9 (ci.yml/security.yml), §10 Fase 0, criterios_de_cierre ("CI verde (SQLite)", "Tests de CI verdes con fallback SQLite"); ADR-019 (fallback SQLite en CI).
- **correccion_exigida_sugerida:** Registrar `C:\Proyectos\Hackathon\.claude\worktrees\reto-5` como worktree git real sobre la rama `RETO-5_IA-CLASIFICACION` (o crear rama/repositorio dedicado `reto5-doc-organizer`), versionar los entregables existentes y crear `.github/workflows/ci.yml` + `security.yml` siguiendo literalmente el esqueleto de CLAUDE.md §9 (matrix `[ubuntu, windows, macos]`, `RETO5_PERSISTENCE: sqlite`, `--cov-fail-under=60`, jobs `lint-format-types`, `tests`, `supabase-migrations` condicional, `security` con `pip-audit` + `bandit -r src`). Verificar el pipeline en GitHub Actions antes de cerrar.

---

### [HIGH] 2. Setteo del entorno incompleto: falta la totalidad del scaffold del proyecto definido en CLAUDE.md §4

- **archivo_linea:** `C:\Proyectos\Hackathon\.claude\worktrees\reto-5\` (ausencia de `pyproject.toml`, `Makefile`, `.env.example`, `.gitignore`, `README.md`, `src/reto5/`, `config/`, `docs/`, `tests/`, `supabase/`)
- **defecto_funcional:** La Fase 0 exige el *setteo* del entorno, pero no existe ningún artefacto de proyecto: sin `pyproject.toml` (uv) no pueden ejecutarse `uv sync`, ruff, black ni mypy --strict; sin `Makefile` no existen los targets `test/lint/ci/run-ui/run-cli` de CLAUDE.md §11; sin la estructura `src/reto5/{domain,ports,adapters/{local,cloud},application,interfaces,utils}` no hay esqueleto donde la Fase 1 inyecte los puertos (IngestPort, StoragePort, MetadataRepoPort, OCRPort, NLPPort, LLMPort, ChunkerPort, FileLockPort, NamingPort). El único contenido es planos + corpus.
- **regla_violada:** CLAUDE.md §4 (estructura del repositorio), §10 Fase 0 ("Setteo entorno"), criterios_de_cierre (cobertura y calidad no verificables).
- **correccion_exigida_sugerida:** Crear el scaffold completo: `pyproject.toml` con Python 3.11, dependencias declaradas del §3 (pydantic v2, sqlalchemy/sqlmodel, typer, rich, streamlit, watchdog, loguru, pytesseract, PyMuPDF, sentence-transformers, pytest, pytest-cov, pytest-asyncio, pytest-mock, vcrpy) y herramienta de lint/format/types (ruff, black line-length 100, mypy --strict); `Makefile` con targets del §11; `.env.example` con placeholders `SUPABASE_*`/`RETO5_*` (sin secrets); `.gitignore` con `data/`, `.venv/`, `.env`, `__pycache__`, `logs/`; `README.md`; y los paquetes `src/reto5/...` vacíos con `__init__.py`.

---

### [HIGH] 3. No existen tests base ni el mocking obligatorio de LLM/OCR/NLP/Chunker de la Fase 0

- **archivo_linea:** `C:\Proyectos\Hackathon\.claude\worktrees\reto-5\tests\` (directorio inexistente)
- **defecto_funcional:** No hay `tests/conftest.py` con las fixtures obligatorias (`fake_llm`, `fake_ocr`, `fake_nlp`, `fake_chunker`, `vcr_llm`, `persistence_backend`), no hay marcadores pytest (`llm_local`, `llm_remote`, `supabase`), ni `addopts = "-m 'not llm_local and not llm_remote'"` en pyproject. Consecuencias: el criterio "tests base" de Fase 0 no se cumple; la cobertura mínima del 60% es 0%; y la regla dura "ningún test en CI invoca LLM real" (ADR-018) queda sin andamiaje de verificación.
- **regla_violada:** CLAUDE.md §7.1–§7.5 (mocking obligatorio, fixtures), §10 Fase 0 ("tests base, mocking LLM"), ADR-018, criterios_de_cierre ("Cobertura ≥ 60%", "Ningún test en CI invoca LLM real", "Ningún test depende de red externa").
- **correccion_exigida_sugerida:** Implementar `tests/conftest.py` con las seis fixtures definidas en CLAUDE.md §7.3 (deterministas, sin red), registrar los tres marcadores y el `addopts` en `pyproject.toml`, y añadir un test base de humo (ej. import de paquete + apertura de BD SQLite WAL en `tmp_path`) que corra con `RETO5_PERSISTENCE=sqlite`. Los adaptadores `OllamaLLM`/`OpenAILLM` nunca deben instanciarse en tests.

---

### [MEDIUM] 4. Configuración externa (YAML), Supabase CLI local y `.env.example` no materializados

- **archivo_linea:** `C:\Proyectos\Hackathon\.claude\worktrees\reto-5\config\` y `C:\Proyectos\Hackathon\.claude\worktrees\reto-5\supabase\` (inexistentes)
- **defecto_funcional:** El diseño exige configuración externa validada (ADR-010/RN-10) y Supabase local-first (ADR-017), pero no existe `config/config.yaml` (con los parámetros ya especificados en planeacion v2.0.1 §0.14.3 `ingesta` y §0.15.7 `persistencia`), ni `config/taxonomia.yaml`, `config/convencion.yaml`, `config/esquemas_metadatos.yaml`; tampoco el scaffold `supabase/{config.toml, migrations/0001_init.sql, migrations/0002_indexes.sql, seed.sql, apply_migrations.py}` ni `.env.example`. Todo queda embebido en markdown → cualquier implementación de Fase 1 hardcodeará valores.
- **regla_violada:** ADR-010 (config externa), ADR-017 (Supabase local-first), ADR-001/RN-10, CLAUDE.md §6 (estrategia local-first, esquema inicial, variables de entorno) y §10 Fase 0 ("Supabase CLI local").
- **correccion_exigida_sugerida:** Crear los 4 YAML de `config/` con las secciones que el propio planeacion define (ingesta: debounce/estabilidad/max_reintentos/backoff/lock_stale/workers/cola_max; persistencia: pragmas WAL completos, writer_batch, mantenimiento; taxonomía FIN–OTR; convención y desambiguación), validarlos con Pydantic, y materializar el scaffold `supabase/` (config.toml generado por `supabase init`, migraciones 0001_init/0002_indexes conforme §6.4 con índices sobre sha256, estado_ingesta, categoria, fecha_documento, audit_log(doc_id, timestamp), y `apply_migrations.py` idempotente) más `.env.example` con placeholders.

---

### [MEDIUM] 5. Contratos de datos con enumerados y campos inconsistentes entre planeacion y CDU

- **archivo_linea:** `Solucion\.claude\planeacion_v2.0.1.md:471` (`estado_ingesta: Literal["ok","cuarentena","bloqueado","corrupto","duplicado"]`), `:502` (`estado_publicacion: Literal["PENDIENTE_MOVER","MOVIDO","FALLO"]`), `:495-504` (`DocumentoProcesado` sin `resumen_denso`/`chunks`/`evidencia`) vs `cdu_v1.0.1.md:171` ("estado ENCOLADO o DUPLICADO") y `:905-909` (`FALLO_COPIA|FALLO_RENAME|FALLO_LIMPIEZA|FALLO_PERMISO|FALLO_DISCO`)
- **defecto_funcional:** Los estados que el CDU usa en UC-01 (`ENCOLADO`, `CUARENTENA`, `BLOQUEADO`, `CORRUPTO`, `DESCARTADO`, `DUPLICADO`, `CIFRADO`) no son admisibles por el `Literal` de `DocumentoRaw.estado_ingesta`; y UC-06 define cinco estados de fallo que `DocumentoProcesado.estado_publicacion` no contempla. Además `DocumentoProcesado` omite los artefactos que UC-02/UC-03/UC-04/UC-12 exigen registrar y auditar: `resumen_denso`, `chunks[]`, `evidencia` (incluyendo `votos_por_categoria`, `tokens_llm`, `chunks_usados`), condición de RN-20/ADR-016. En la implementación, la validación Pydantic v2 estricta rechazará estados legítimos o descartará evidencia obligatoria.
- **regla_violada:** RN-04 (trazabilidad), RN-20 (tokens y chunks auditables), ADR-016, contrato de datos estricto Pydantic v2 (§0.12 / checklist "Contrato de datos estricto").
- **correccion_exigida_sugerida:** Unificar en el diseño un único vocabulario de estados por campo (un `Enum` de ingesta y otro de publicación que cubran todos los flujos alternativos del CDU) y enriquecer `DocumentoProcesado` con `resumen_denso: str | None`, `chunks: list[Chunk]` y `evidencia: dict` (con `votos_por_categoria`, `tokens_llm`, `chunks_usados`) para cumplir RN-20 antes de codificar los modelos.

---

### [LOW] 6. ADRs 001–019 e informe de auditoría no existen como artefactos documentales

- **archivo_linea:** `docs\ADRs\` y `docs\audits\` (directorios inexistentes; ADRs solo inline en planeacion §0.19 + CDU §8 + CLAUDE.md §15)
- **defecto_funcional:** Los ADRs son tablas incrustadas en tres markdown y se dispersan entre versiones de documento; no hay `docs/ADRs/ADR-001.md`…`ADR-019.md` versionables ni `docs/audits/fase-N-opencode.md` donde firmar los hallazgos, pese a que CLAUDE.md §2.2 lo exige ("Entrega un informe firmado como docs/audits/fase-N-opencode.md").
- **regla_violada:** CLAUDE.md §2.2 (informe firmado), §4 (estructura docs/ADRs, docs/audits), criterio documentación (CDU §8/§11).
- **correccion_exigida_sugerida:** Materializar cada ADR (001–019) como `docs/ADRs/ADR-NNN.md` con formato Contexto/Decisión/Consecuencias, y crear `docs/audits/` para los informes de auditoría por fase una vez exista el repositorio versionado.

---

### [LOW] 7. README de inicio y guía de uso ausentes

- **archivo_linea:** `C:\Proyectos\Hackathon\.claude\worktrees\reto-5\README.md` (inexistente)
- **defecto_funcional:** No existe documentación de arranque (instalación con `uv sync`, copia de `.env.example`, targets `make ci/test/run-ui`, marcadores de prueba excluidos por defecto), lo que dificulta replicar el entorno que la propia Fase 0 debe dejar "setteado".
- **regla_violada:** CLAUDE.md §11 (comandos de desarrollo), §4 (README en estructura).
- **correccion_exigida_sugerida:** Añadir `README.md` con: requisitos (Python 3.11, Docker opcional para Supabase local), quickstart (setup de entorno, ejecución de `docs`, CLI, tests, CI local), y referencia a los ADRs.

---

**cobertura_evaluada:** ["Fase 0 — setteo del entorno y planos", "CLAUDE.md §3/§4/§7/§9/§10 (stack, estructura, mocking, CI, alcance Fase 0)"]

**Nota de alcance:** Los items del checklist funcional (UC-01 a UC-12: locking 5 capas, WAL/WriterThread/outbox, chunking/resumen/agregación, naming, atomicidad cross-partition, etc.) NO se reportan como hallazgos porque su código pertenece a Fases 1–5; su **diseño** en `planeacion_v2.0.1.md` y `cdu_v1.0.1.md` se revisó y cumple: las 5 capas de ingesta (debounce→estabilidad→try-lock→backoff→magic bytes), los 8 PRAGMAs WAL, escritor único + lectores RO, outbox `PENDIENTE_MOVER`, detección `st_dev` + Copy-and-Delete con verificación hash y limpieza transaccional, y chunking/resumen denso/agregación de votos dentro de `llm_ventana_contexto`. El corpus `Documentos/` (773 PDFs; cabeceras `%PDF-1.x` verificadas; 10 KB a 12 MB) es válido como entrada de prueba de Fase 1.

**recomendaciones_no_bloqueantes:**
1. Fijar en `config.yaml` los valores por defecto todavía ambiguos en el diseño: `estrategia_agregacion`, `max_tokens_prompt`, `max_chunks_llm`, `max_chunks_metadatos` y `llm_ventana_contexto` (8192), para que UC-03/UC-04 tengan contrato inequívoco.
2. Congelar el vocabulario de estados (ingesta/publicación) en un único enum antes de implementar UC-01, para no arrastrar la inconsistencia de contratos a la BD.
3. Incluir un test base de humo de los 8 PRAGMAs WAL al iniciar Fase 1, aprovechando el `event.listens_for(Engine, "connect")` del §0.15.2.
4. Versionar las cassettes de VCR.py (directorio `tests/fixtures/cassettes/`) desde Fase 2, cuando exista el primer test de integración con LLM remoto.

**Cierre de Fase 0:** NO cerrable. Requiere resolver el CRITICAL y los 3 HIGH (repositorio+CI, scaffold, tests base/mocking) como mínimo, y verificar cobertura ≥ 60 % y CI verde en GitHub Actions.