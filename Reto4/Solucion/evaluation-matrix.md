# Matriz de evidencia para el Reto 4

Esta matriz conecta los criterios de evaluaciÃƒÂ³n con evidencia reproducible. No
sustituye pruebas reales ni afirma mÃƒÂ©tricas aÃƒÂºn no medidas.

| Criterio | ImplementaciÃƒÂ³n | Evidencia a entregar |
| --- | --- | --- |
| Enfoque tÃƒÂ©cnico | YOLO11s/OpenVINO, ByteTrack, Shapely, procesos aislados. | `docs/architecture.md`, configuraciÃƒÂ³n YAML y cÃƒÂ³digo fuente. |
| DetecciÃƒÂ³n/reconocimiento | Personas filtradas por clase y tracks temporales. | `annotated.mp4`, `tracks.jsonl`, prueba con video real. |
| Puntos crÃƒÂ­ticos | Zonas de conteo, permanencia, lÃƒÂ­nea, intrusiÃƒÂ³n y exclusiÃƒÂ³n. | YAML de cÃƒÂ¡mara, HUD y `events.csv`. |
| PrecisiÃƒÂ³n | Evaluador IoU 0.5 para Precision, Recall, F1, MOTA e IDF1. | `validation.json` generado contra ground truth independiente. |
| Rendimiento | Backpressure batch, OpenVINO CPU/GPU, mÃƒÂ©tricas p95/p99/FPS. | `metrics.json` y especificaciÃƒÂ³n del hardware. |
| Utilidad | Aforo, permanencia, cruces e intrusiones como eventos consultables. | CSV/JSONL/SQLite o tabla Supabase. |
| Arquitectura/integraciÃƒÂ³n | Sinks desacoplados, RLS, cÃƒÂ¡mara por YAML y extensiones. | SQL de Supabase, arquitectura y prueba de permisos. |
| DocumentaciÃƒÂ³n | InstalaciÃƒÂ³n, configuraciÃƒÂ³n, operaciÃƒÂ³n, lÃƒÂ­mites y seguridad. | README y `docs/`. |

## Guion de demostraciÃƒÂ³n

1. Mostrar el YAML y dibujar las zonas sobre un frame de la cÃƒÂ¡mara.
2. Ejecutar `run_batch.py` con un clip corto y abrir `annotated.mp4`.
3. Mostrar `events.csv`, `tracks.jsonl` y `metrics.json`.
4. Mostrar una consulta de Supabase o SQLite para eventos por cÃƒÂ¡mara y zona.
5. Si existe ground truth, ejecutar `validate.py` y explicar F1/MOTA.

## Evidencia pendiente antes de presentar

- Capturas legibles de HUD, eventos y mÃƒÂ©tricas de una corrida final.
- Video demostrativo de menos de tres minutos siguiendo el guion.
- Ground truth y `validation.json` para afirmar precisiÃƒÂ³n cuantitativa.
- Registro de dispositivo, versiÃƒÂ³n de modelo y fecha de la corrida final.
