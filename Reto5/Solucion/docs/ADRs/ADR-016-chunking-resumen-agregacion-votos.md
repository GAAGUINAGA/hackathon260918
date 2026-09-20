# ADR-016: Chunking + resumen denso + agregación de votos para LLM

## Contexto
Los modelos LLM locales pequeños tienen ventana de contexto acotada
(`llm_ventana_contexto`, 8192 tokens por defecto). Enviar el texto completo de un
documento extenso satura el contexto o produce respuestas degradadas.

## Decisión
UC-02 genera un resumen denso (extractivo, con pasada abstractiva opcional si hay
LLM disponible) y chunks semánticos con metadatos de posición. UC-03/UC-04
invocan el LLM primero sobre el resumen (prompt compacto); solo si la confianza
es insuficiente, procesan chunks priorizados (encabezado, firma, mayor score de
embedding) de forma individual y agregan resultados
(`voto_mayoria | ponderada | jerarquica`, configurable en `config.yaml`).

## Consecuencias
Cero prompts fuera de ventana de contexto (RN-17), costo de tokens auditable por
documento (RN-20, `audit_log.tokens_llm`/`chunks_usados`). Añade complejidad de
orquestación (dos-tres pasadas) frente a un único prompt con el texto completo.
