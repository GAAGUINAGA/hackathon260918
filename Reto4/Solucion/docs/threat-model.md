# Threat Model — Motor Analitico Edge (STRIDE)

**Estado:** Borrador (Fase 0.5) — se completa en Fase 6.
**Baseline:** `.claude/planeacion_v1.2.0.md` Sec.9 (Security-First Architecture).

## Alcance

Motor edge de vision por computadora que procesa video `.mp4` local, sin
servidor HTTP en Fase 1, sin GPU, ejecutado como proceso batch por un
operador de infraestructura.

## Analisis STRIDE

| Amenaza | Vector en este sistema | Mitigacion | Fase |
|---|---|---|---|
| **Spoofing** | Video de entrada manipulado / modelo sustituido. | Hash SHA256 del IR verificado al cargar (`src/security/model_integrity.py`). Extension allowlist. | Fase 2 |
| **Tampering** | YAML con reglas maliciosas. | `yaml.safe_load` (nunca `eval`/`exec`). Esquema Pydantic `CameraConfig` con `extra='forbid'`. | Fase 3 |
| **Repudiation** | Eventos de telemetria sin trazabilidad. | `event_id` UUIDv4 + `timestamp_utc` timezone-aware en `EventoTelemetria` (`src/telemetry/events.py`, ya implementado en Fase 0). Hash de sesion al final de la ejecucion. | Fase 0 (parcial) / Fase 4 |
| **Information disclosure** | Logs con paths absolutos o PII accidental. | Filtro de redaccion (`src/security/log_redaction.py`). Sin ReID -> sin embeddings biometricos. | Fase 4 |
| **Denial of Service** | Video de tamano patologico, aforo excesivo, cola sin limite. | `max_video_size_mb` (`src/security/limits.py`). Colas acotadas con `enqueue_drop_oldest`. | Fase 1 |
| **Elevation of Privilege** | Dependencia de la cadena de suministro comprometida. | `pip-audit` + `safety` + `bandit` en CI (activos desde Fase 0.5). `requirements*.txt` con hashes (`pip-compile --generate-hashes`). | Fase 0.5 |

## Estado de mitigaciones a la fecha (Fase 0.5)

- Gates de CI activos: `bandit -r src/`, `pip-audit`, `safety check`, `detect-secrets scan`.
- `requirements.txt` / `requirements-dev.txt` regenerados con `pip-compile --generate-hashes`.
- Contrato `EventoTelemetria` ya cierra Tampering/Repudiation a nivel de dato (inmutable, `extra='forbid'`, validado).
- Resto de mitigaciones marcadas por fase: pendientes de implementacion segun el flujo de `.claude/CLAUDE.md` Sec.3.

## Proxima revision

Este documento se cierra en Fase 6 con el estado final de cada mitigacion y
evidencia de verificacion (log de CI, resultado de `bandit`/`pip-audit`).
