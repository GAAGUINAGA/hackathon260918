# Motor Analítico Edge para oficinas

Solución de visión por computadora para analizar videos de una oficina. Detecta
personas, les asigna un identificador temporal, evalúa zonas configurables y
genera evidencia visual y telemetría estructurada. Está pensada para ejecutarse
cerca de la cámara o por lotes sobre grabaciones; no expone un servidor HTTP.

## Qué resuelve

- Detección de personas con YOLO11s exportado a OpenVINO.
- Tracking temporal con ByteTrack, sin ReID ni embeddings biométricos.
- Conteo, permanencia, cruce de línea, intrusión y zonas de exclusión.
- Video `annotated.mp4`, eventos CSV/JSONL/SQLite, tracks y métricas SLA.
- Envío opcional de eventos a Supabase con JWT de inserción exclusiva.

La solución no identifica la identidad de una persona. Un `track_id` solo es
válido dentro de una ejecución y cámara.

## Inicio rápido

Desde la raíz de esta solución:

```powershell
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt
```

Exporta los pesos una vez y configura la cámara:

```powershell
.\.venv\Scripts\python.exe -m src.ai.export_openvino `
  --weights "C:\ruta\yolo11s.pt" `
  --out ".\models\yolov11s_openvino_model" `
  --imgsz 640
```

El exportador crea `yolo11s.xml`, `yolo11s.bin` y `SHA256SUMS`. El motor no
carga el modelo si los hashes no coinciden. Ajusta después
`configs/camara_oficina_principal.yaml` para la cámara, zonas y dispositivo.

Procesa una grabación:

```powershell
.\.venv\Scripts\python.exe scripts\run_batch.py "C:\videos\camara.mp4"
```

La salida queda en `output/<video>-<fecha-UTC>/`. Consulta la
[guía de operación](operations.md) antes de una ejecución larga.

## Flujo de procesamiento

```text
Video local
  → lectura, validación y resize
  → inferencia OpenVINO (CPU o GPU Intel)
  → memoria compartida, sin copiar arrays por la cola
  → ByteTrack + reglas espaciales
  → HUD y video anotado + eventos locales
  → Supabase opcional
```

En batch las colas aplican backpressure: el lector espera cuando el análisis
está ocupado y no descarta frames de inferencia. `metrics.json` informa
`frames_expected`, `frames_processed` y `frames_dropped`; el SLA falla si no
llegan todos los frames esperados.

## Artefactos de una corrida

| Archivo | Uso |
| --- | --- |
| `annotated.mp4` | Evidencia visual, al FPS original; el HUD se renderiza a `resolution_target`. |
| `events.csv` / `.jsonl` / `.sqlite` | Eventos de negocio y consulta local. |
| `tracks.jsonl` | Bboxes y `track_id` por frame de inferencia. |
| `metrics.json` | SLA: FPS efectivo, latencias p95/p99 y entrega de frames. |
| `supabase-buffer.jsonl` | Buffer local cuando el sink remoto está configurado. |

## Precisión y validación

Para medir Precision, Recall, F1, MOTA e IDF1 se necesita ground truth
anotado. El formato esperado y el comando están en la
[guía de operación](operations.md#validación-con-ground-truth).
Sin etiquetas, el sistema puede demostrar detecciones, eventos y rendimiento,
pero no debe afirmar una precisión cuantitativa.

## Documentación

- [Operación, instalación y configuración](operations.md)
- [Arquitectura y escalabilidad](docs/architecture.md)
- [Esquema de eventos](docs/schema/events.md)
- [Matriz frente a los criterios del reto](evaluation-matrix.md)
- [Retrospectiva y mejoras](retrospective.md)
- [Modelo de amenazas](docs/threat-model.md), [seguridad](SECURITY.md) y
  [accesibilidad](ACCESSIBILITY.md)

## Verificación local

```powershell
.\.venv\Scripts\python.exe -m black --check src tests scripts
.\.venv\Scripts\python.exe -m ruff check src tests scripts
.\.venv\Scripts\python.exe -m mypy src
.\.venv\Scripts\python.exe -m pytest tests -v
```
