# Arquitectura y evolución

## Componentes

```text
Video local → Ingesta/resize → Inferencia OpenVINO (CPU/GPU)
                                  │ SharedFrame
                                  ▼
                    AnalyticsProcess aislado
             ByteTrack → zonas → reglas → HUD
                                  │
       annotated.mp4 + eventos locales + Supabase opcional
                                  │
                     tracks.jsonl + metrics.json
```

## Decisiones técnicas

**OpenVINO + YOLO11s.** Detecta personas con un IR portable para CPU o GPU
Intel. Los archivos `.xml` y `.bin` se validan con SHA-256 antes de cargar.

**ByteTrack sin ReID.** Cada persona recibe un ID temporal para correlacionar
movimiento. No utiliza rostro, embeddings biométricos ni identidad personal.

**Geometría normalizada.** Shapely evalúa el ancla bottom-center de cada bbox
contra polígonos y líneas en `[0, 1]`; las reglas se recalibran al cambiar de
cámara o encuadre.

**Aislamiento y memoria.** Ingesta e inferencia son hilos. Tracker, reglas,
HUD, escritura y sinks se ejecutan en `AnalyticsProcess`. El frame viaja por
memoria compartida; las colas solo transportan su descriptor, shape y dtype.

**Batch sin pérdida.** Las colas son acotadas. Si analytics se atrasa, el
productor espera mediante backpressure. `metrics.json` compara frames esperados
contra procesados y hace fallar el SLA si hay descartes.

## Reglas y utilidad

| Regla | Disparador | Resultado |
| --- | --- | --- |
| Conteo | Cambio de ocupación o intervalo. | Aforo actual y máximo. |
| Permanencia | Se supera un tiempo en zona. | Uso prolongado de área. |
| Cruce de línea | El ancla cruza una línea. | Entradas y salidas. |
| Intrusión | Entrada a zona restringida. | Alerta de acceso. |
| Exclusión | Persona en zona ignorada. | Evita análisis irrelevante. |

Los eventos contienen frame, tiempo UTC, cámara, zona, confianza, ancla y
`track_id` en eventos individuales.

## Integración y escalabilidad

- Una configuración YAML y un proceso por cámara; `camera_id` segmenta datos.
- Supabase puede alimentar dashboards, vistas SQL, BI y aplicaciones internas.
- Un nuevo `RuleHandler` agrega una regla sin modificar detector ni pipeline.
- Un nuevo `TelemetrySink` integra otro almacén sin cambiar analítica.
- Un adaptador futuro RTSP/WebRTC puede definir una política explícita de baja
  latencia distinta al modo batch.

## Límites actuales

- El HUD usa `resolution_target`, no resolución nativa; conserva el original
  cuando se requiera máxima fidelidad forense.
- Rendimiento depende de codec, resolución, dispositivo y cantidad de personas.
- F1, MOTA e IDF1 requieren ground truth independiente.
- Los artefactos locales son la evidencia primaria; Supabase es opcional.
