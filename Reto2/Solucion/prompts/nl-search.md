# Prompt: nl-search

**Estado:** Diferido a Fase 7 (ADR-20). Redactado como reserva arquitectonica;
sin ejecucion en las fases F1-F6. UC-11 (busqueda) usa exclusivamente
`tsvector` + `pg_trgm` + `unaccent`, sin invocar este prompt.

Proposito previsto: traducir consultas en lenguaje natural a filtros
estructurados sobre `ContactQueryPort`, sin tocar el motor de busqueda
determinista existente. Se redacta en detalle al iniciar la Fase 7.
