# ADR-008: Umbral de confianza → `_Pendientes`

## Contexto
Publicar automáticamente un documento mal clasificado o mal nombrado es más costoso
de corregir que dejarlo en cola de revisión.

## Decisión
Si la confianza global de clasificación/metadatos cae por debajo de
`umbral_confianza_revision` (`config.yaml`), el documento se marca
`requiere_revision=True`, recibe el sufijo `_REVISAR` y se enruta a `_Pendientes`.

## Consecuencias
Se prioriza precisión sobre cobertura automática. Introduce una cola de revisión
humana (UC-08) como parte necesaria del flujo, no como excepción.
