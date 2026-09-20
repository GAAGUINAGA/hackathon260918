# ADR-003: Pipeline híbrido (reglas + NLP + embeddings + LLM)

## Contexto
Ninguna técnica aislada cubre todos los casos: las reglas son frágiles ante
variaciones, el ML clásico requiere dataset etiquetado, y el LLM puro es costoso,
no determinista y no siempre disponible.

## Decisión
Pipeline híbrido: reglas deterministas para casos claros, embeddings/similitud como
segunda capa, y LLM como árbitro solo en casos ambiguos o de conflicto.

## Consecuencias
Robustez y explicabilidad (evidencia por capa), control de costo (el LLM solo se
invoca cuando es necesario) y degradación segura si el LLM no está disponible.
