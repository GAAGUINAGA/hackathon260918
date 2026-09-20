# ADR-009: Auditoría obligatoria por documento

## Contexto
Cada decisión automatizada (clasificación, metadatos, naming, movimiento) debe
poder justificarse ante un auditor o responsable de cumplimiento.

## Decisión
Toda etapa del pipeline registra una entrada en `audit_log` (doc_id, etapa,
decisión, método, tokens_llm, chunks_usados, timestamp). Ninguna transición de
estado ocurre sin su registro correspondiente.

## Consecuencias
Trazabilidad completa y mejora continua basada en evidencia. Costo adicional de
escritura, mitigado por el `WriterThread` en batch (ver ADR-012).
