# OperaciÃƒÂ³n e instalaciÃƒÂ³n

## Requisitos

| Componente | Requerimiento |
| --- | --- |
| Sistema | Windows 10/11 o Linux de 64 bits. |
| Python | 3.10 o superior. |
| CPU | x86_64; OpenVINO tiene ejecuciÃƒÂ³n CPU. |
| GPU opcional | GPU Intel visible para OpenVINO y controlador actualizado. |
| Memoria | 16 GB recomendados para video de alta resoluciÃƒÂ³n. |
| Almacenamiento | Espacio para el video fuente y `annotated.mp4`. |

El runtime usa OpenVINO, OpenCV headless, NumPy, Pydantic, Shapely, LAP y
PyYAML. `requirements-dev.txt` aÃƒÂ±ade pruebas, anÃƒÂ¡lisis estÃƒÂ¡tico y Ultralytics
para exportar pesos.

## Instalar

```powershell
cd C:\Proyectos\Hackathon\.claude\worktrees\reto4-vision-artificial\Reto4\Solucion
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt -r requirements-dev.txt
```

Comprueba los dispositivos OpenVINO:

```powershell
.\.venv\Scripts\python.exe -c "import openvino as ov; print(ov.Core().available_devices)"
```

Usa `CPU` si no aparece una GPU Intel. Si aparece `GPU.0`, configÃƒÂºrala en
`configs/camara_oficina_principal.yaml` como `model.device: "GPU.0"`.

## Exportar y verificar el modelo

```powershell
.\.venv\Scripts\python.exe -m src.ai.export_openvino `
  --weights "C:\ruta\yolo11s.pt" `
  --out ".\models\yolov11s_openvino_model" `
  --imgsz 640
```

El directorio debe tener un `.xml`, un `.bin` y `SHA256SUMS`. El motor valida
los hashes antes de inferir; no reutilices sumas de otro modelo.

```powershell
.\.venv\Scripts\python.exe -c "from pathlib import Path; from src.ai.detector import build_detector; build_detector(Path('models/yolov11s_openvino_model'), device='GPU.0'); print('MODELO_OK')"
```

Sustituye `GPU.0` por `CPU` cuando sea necesario.

## Configurar la cÃƒÂ¡mara

`configs/default.yaml` define resoluciÃƒÂ³n, extensiones permitidas, lÃƒÂ­mite de
tamaÃƒÂ±o y capacidad de cola. La configuraciÃƒÂ³n de cÃƒÂ¡mara define:

| Campo | PropÃƒÂ³sito |
| --- | --- |
| `camera_id` | Identificador estable de la cÃƒÂ¡mara. |
| `resolution_target` | ResoluciÃƒÂ³n de inferencia y del HUD. |
| `inference_rate` | Analiza uno de cada N frames. `5` a 25 FPS resulta en 5 FPS de inferencia. |
| `confidence_threshold` / `iou_threshold` | Umbrales de detecciÃƒÂ³n y NMS. |
| `model.path` / `model.device` | Directorio OpenVINO y `CPU` o `GPU.0`. |
| `zones` | PolÃƒÂ­gonos normalizados `[x, y]` o lÃƒÂ­neas de dos puntos. |

Tipos de zona: `exclusion`, `count`, `dwell`, `line_crossing` e `intrusion`.
Pydantic y Shapely rechazan polÃƒÂ­gonos invÃƒÂ¡lidos y coordenadas fuera de rango.

## Procesar videos por lote

```powershell
.\.venv\Scripts\python.exe scripts\run_batch.py `
  "C:\videos\camara.mp4" `
  --camera-config configs\camara_oficina_principal.yaml `
  --pipeline-config configs\default.yaml
```

El modo batch usa backpressure: conserva los frames seleccionados por
`inference_rate` sin agotar memoria. El tiempo esperado es aproximadamente
`frames_seleccionados / FPS_efectivo`; no cierres la terminal durante videos
largos. Cada corrida crea `output/<video>-<fecha-UTC>/`.

| CÃƒÂ³digo | Significado |
| --- | --- |
| 0 | Procesamiento y SLA aprobados. |
| 10Ã¢â‚¬â€œ16 | Error de ingesta, configuraciÃƒÂ³n, proceso, salida, telemetrÃƒÂ­a o render. |
| 17 | Los artefactos existen, pero el SLA fallÃƒÂ³. |
| 18 | Integridad del modelo invÃƒÂ¡lida. |

Usa `--allow-sla-fail` solo para exploraciÃƒÂ³n.

## Interpretar y validar

`metrics.json` contiene `frames_expected`, `frames_processed`,
`frames_dropped`, FPS efectivo, p95 y p99. Un descarte hace fallar el SLA. Los
umbrales iniciales son 5 FPS, p95 Ã¢â€°Â¤ 250 ms y p99 Ã¢â€°Â¤ 400 ms; deben medirse en el
hardware y cÃƒÂ¡mara reales.

Para F1/MOTA se necesita ground truth independiente:

```json
{"frames":[{"frame_idx":120,"objects":[{"track_id":1,"bbox_xyxy":[100,50,220,400]}]}]}
```

```powershell
.\.venv\Scripts\python.exe scripts\validate.py `
  --predictions output\<corrida>\tracks.jsonl `
  --ground-truth C:\anotaciones\camara.gt.json `
  --output output\<corrida>\validation.json
```

El evaluador usa IoU 0.5 y calcula Precision, Recall, F1, MOTA e IDF1. Meta:
F1 Ã¢â€°Â¥ 0.85 y MOTA Ã¢â€°Â¥ 0.70. No uses el video anotado como ground truth.

## Supabase opcional

1. Ejecuta `infrastructure/supabase/schema.sql` y despuÃƒÂ©s
   `infrastructure/supabase/rls_policies.sql` como propietario.
2. Copia `.env.example` a `.env`; configura `SUPABASE_URL`,
   `SUPABASE_API_KEY`, `SUPABASE_EDGE_KEY` y `SUPABASE_ENABLED=true`.
3. Habilita el sink `supabase` en la configuraciÃƒÂ³n de cÃƒÂ¡mara.

La API key es publishable/anon. El JWT edge tiene rol `edge_ingest` y solo
inserta. Genera el token con `scripts/genToken.mjs`; el secreto firmante no va
en `.env`, Git ni el equipo edge.

## DiagnÃƒÂ³stico y calidad

- `MODEL_INTEGRITY_FAIL`: vuelve a exportar o regenera hashes.
- `INGEST_FAIL`: revisa ruta, extensiÃƒÂ³n y lÃƒÂ­mite de tamaÃƒÂ±o.
- No aparece `GPU.0`: actualiza driver Intel o cambia a `CPU`.
- `SLA_VIOLATION`: ajusta resoluciÃƒÂ³n/tasa y vuelve a medir F1/MOTA.
- Supabase 401/403: verifica API key, JWT edge, rol y RLS.

```powershell
.\.venv\Scripts\python.exe -m black --check src tests scripts
.\.venv\Scripts\python.exe -m ruff check src tests scripts
.\.venv\Scripts\python.exe -m mypy src
.\.venv\Scripts\python.exe -m pytest tests -v
```
