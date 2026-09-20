# Aviso de terceros — ByteTrack (Ultralytics)

Este paquete (`src/ai/tracking/`) contiene codigo adaptado de
[Ultralytics](https://github.com/ultralytics/ultralytics)
(`ultralytics/trackers/`), licenciado bajo **AGPL-3.0**
(ver `LICENSE-AGPL-3.0.txt` en este directorio).

Version de origen: `ultralytics==8.4.156`.

**Decision de arquitectura (Reto 4, Fase 2):** se vendoriza el codigo del
tracker en vez de depender de `ultralytics` via pip para no requerir
`torch` en el runtime de produccion (motor edge, sin GPU, superficie
minima segun P1). La obligacion de licencia AGPL-3.0 es la misma en
ambos casos (vendorizar o depender via pip); se documenta aqui la
decision, no se intenta evadir la licencia.

## Archivos y su origen

| Archivo aqui | Origen | Cambios |
|---|---|---|
| `basetrack.py` | `ultralytics/trackers/basetrack.py` | Ninguno (copia fiel). |
| `kalman_filter.py` | `ultralytics/trackers/utils/kalman_filter.py` | Se elimina `KalmanFilterXYWH` (solo `KalmanFilterXYAH` es usada por ByteTrack). |
| `matching.py` | `ultralytics/trackers/utils/matching.py` + `ultralytics/utils/metrics.py::bbox_ioa` | Se elimina `embedding_distance` (solo usado por ReID/BoT-SORT, fuera de alcance con `with_reid=False`). Se elimina la ruta OBB/`batch_probiou` (no usamos cajas orientadas). Se inlinea `bbox_ioa` para no vendorizar todo `ultralytics.utils.metrics`. `lap` pasa a ser dependencia directa obligatoria (se quita el fallback `check_requirements`). |
| `stracks.py` | `ultralytics/trackers/utils/stracks.py` | Se elimina `multi_gmc` (Global Motion Compensation, funcionalidad opcional no usada). |
| `byte_tracker.py` | `ultralytics/trackers/byte_tracker.py` | Se elimina el soporte de cajas orientadas (`angle`/`xywha`, campo opcional no usado) y la rama de GMC en `_pre_first_associate` (dependia de `multi_gmc`, no vendorizada). `LOGGER` pasa de `ultralytics.utils.LOGGER` a `logging.getLogger(__name__)` local. `xywh2ltwh` (de `ultralytics.utils.ops`) se inlinea como funcion privada de 3 lineas. Imports re-apuntados a este paquete local. |

Ningun cambio altera la logica del algoritmo ByteTrack en si (asociacion
en dos etapas, Kalman, IoU); solo se recorta funcionalidad no usada
(GMC, ReID/embeddings, OBB) y se desacopla de `ultralytics.utils`/`torch`.
