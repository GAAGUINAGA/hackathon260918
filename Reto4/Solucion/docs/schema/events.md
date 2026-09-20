# Esquema de eventos

`events.csv` usa UTF-8 y contiene una fila por evento.

| Columna | Tipo | Descripción |
| --- | --- | --- |
| `event_id` | UUID | Identificador inmutable del evento. |
| `timestamp_utc` | datetime UTC | Momento de emisión. |
| `frame_idx` | entero | Índice en el video fuente. |
| `camera_id` | texto | Cámara configurada. |
| `event_type` | texto | Tipo de evento analítico. |
| `track_id` | entero/null | Track individual; nulo solo en conteos agregados. |
| `zone_name` | texto/null | Zona o línea que originó el evento. |
| `dwell_seconds` | decimal/null | Permanencia, si aplica. |
| `confidence` | decimal/null | Confianza de detección/tracking. |
| `anchor_xy` | par normalizado | Punto espacial en rango [0, 1]. |
| `metadata` | JSON | Datos adicionales de regla. |
