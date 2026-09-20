# ADR-011: File locking en 5 capas (debounce + estabilidad + try-lock + cuarentena + validación)

## Contexto
`watchdog` dispara `on_created` cuando el SO crea el archivo, no cuando termina de
copiarse. Procesar un archivo en tránsito produce OCR sobre bytes corruptos,
`PermissionError` al mover, o nombres generados a partir de basura.

## Decisión
Estrategia en 5 capas antes de encolar un documento (UC-01):
1. Debounce de eventos (`debounce_segundos`).
2. Estabilidad de tamaño (N lecturas iguales consecutivas).
3. Try-lock exclusivo (`msvcrt`/`fcntl`/lockfile adyacente).
4. Cuarentena y reintento con backoff exponencial (máx. 6 intentos).
5. Validación post-lectura (magic bytes + hash).

## Consecuencias
Evita procesar archivos en tránsito o corruptos (RN-01, RN-03). Añade latencia
mínima (segundos) a la detección, aceptable frente al riesgo de corrupción.
