# ADR-013: Patrón outbox para mover archivos tras commit

## Contexto
Persistir el registro en BD y mover el archivo en el filesystem son dos
operaciones separadas; un crash entre ambas puede dejarlas inconsistentes.

## Decisión
Se persiste primero con estado `PENDIENTE_MOVER`, luego se mueve el archivo vía
`StoragePort`, y finalmente se actualiza a `MOVIDO` (o `FALLO` si el movimiento
falla). Un crash entre ambos pasos es recuperable sin pérdida de datos.

## Consecuencias
Consistencia BD ↔ filesystem incluso ante fallos (RN-07). Requiere lógica de
reconciliación al reiniciar (detectar `PENDIENTE_MOVER` huérfanos).
