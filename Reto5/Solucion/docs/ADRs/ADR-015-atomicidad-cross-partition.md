# ADR-015: Detección de `st_dev` + Copy-and-Delete para movimientos cross-partition

## Contexto
`os.replace` es atómico solo si origen y destino residen en el mismo sistema de
archivos/partición/volumen. Cuando `st_dev` difiere, el SO no puede garantizar
atomicidad.

## Decisión
El `Organizador` (UC-06) compara `os.stat(origen).st_dev` con
`os.stat(destino).st_dev`. Si coinciden, usa `os.replace` atómico. Si difieren,
aplica **Copy-and-Delete**: copia a un temporal en la partición destino
(`{destino}.tmp-{uuid}`), verifica integridad (tamaño + sha256), `os.replace`
atómico dentro del destino, y solo entonces elimina el origen. Ante fallo en
cualquier paso intermedio, nunca se elimina el origen antes de verificar el
destino (RN-16); si falla la limpieza final, se mantienen ambos archivos y se
alerta (RN-19, `FALLO_LIMPIEZA`).

## Consecuencias
Cero pérdida de datos en movimientos cross-partition, a costa de mayor latencia
(copia + verificación) frente al `rename` directo. Requiere pruebas de
recuperación tras crash (`test_destino_tmp_huerfano`, `test_hash_mismatch_post_copia`).
