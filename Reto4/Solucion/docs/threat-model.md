# Modelo de amenazas (STRIDE)

**Estado:** Final de Fase 6.

| Amenaza | Riesgo | Mitigación | Evidencia |
| --- | --- | --- | --- |
| Spoofing | Video o modelo sustituido. | Allowlist de extensión y SHA-256 del IR. | `test_model_integrity.py`. |
| Tampering | YAML o datos de evento maliciosos. | `yaml.safe_load`, Pydantic estricto e inmutabilidad. | `test_yaml_sandbox.py`, tests de eventos. |
| Repudiation | Alerta sin trazabilidad. | UUID, fecha UTC y artefactos por corrida. | CSV, JSONL y SQLite. |
| Information disclosure | PII, claves o biometría. | Redacción de logs, sin ReID y secretos fuera del repositorio. | `test_log_redaction.py`, `.env` ignorado. |
| Denial of service | Video o cola patológica. | Límite de tamaño, colas acotadas y timeout tipificado. | Tests de límites y cierre. |
| Elevation of privilege | Edge con permisos excesivos. | JWT de vida corta, RLS e inserción únicamente. | Inserción remota y GET/PATCH/DELETE rechazados con 403. |

## Revisión continua

Ejecutar análisis estático, auditoría de dependencias y pruebas antes de un
despliegue. Revisar este documento cuando se modifiquen el modelo, las
políticas RLS, dependencias o integraciones externas.
