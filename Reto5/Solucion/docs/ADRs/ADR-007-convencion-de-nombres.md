# ADR-007: Convención de nombres `YYYY-MM-DD_CAT_TIPO_ENTIDAD_ID_vNN`

## Contexto
Los documentos organizados deben poder ordenarse y filtrarse por sistema de
archivos sin herramientas adicionales.

## Decisión
Nombre estructurado `{YYYY-MM-DD}_{CAT}_{TIPO}_{ENTIDAD-PERSONA}_{ID}_{vNN}{_ESTADO}.{ext}`,
normalizado (mayúsculas, sin acentos, sin espacios), máximo 180 caracteres.
Implementado en `config/convencion.yaml`.

## Consecuencias
Ordenable cronológicamente, filtrable por categoría/tipo, consistente entre
documentos. Requiere reglas de desambiguación para fecha/entidad/persona ausentes
o múltiples (ver UC-05 en `cdu_v1.0.1.md`).
