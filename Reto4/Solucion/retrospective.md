# Retrospectiva y mejoras propuestas

## Lo que funciona hoy

- El pipeline procesa grabaciones largas de forma acotada en memoria.
- OpenVINO permite probar CPU y GPU Intel sin cambiar el modelo exportado.
- Los resultados no dependen solo del video: eventos, tracks y mÃƒÂ©tricas son
  artefactos estructurados y auditables.
- La configuraciÃƒÂ³n por cÃƒÂ¡mara evita codificar zonas en Python.
- La integraciÃƒÂ³n remota aplica mÃƒÂ­nimo privilegio mediante RLS.

## QuÃƒÂ© se puede mejorar

| Prioridad | Mejora | Motivo y resultado esperado |
| --- | --- | --- |
| Alta | Construir ground truth y evaluaciÃƒÂ³n periÃƒÂ³dica. | Permite demostrar F1/MOTA, ajustar umbrales y detectar regresiones. |
| Alta | Calibrar zonas con usuarios del espacio. | Reduce falsos positivos de permanencia e intrusiÃƒÂ³n. |
| Alta | Ensayar videos largos en CPU y GPU documentando hardware. | Convierte el SLA en una decisiÃƒÂ³n basada en evidencia. |
| Media | Separar telemetrÃƒÂ­a remota del path caliente mediante lote asÃƒÂ­ncrono. | Evita que una red lenta afecte el throughput del anÃƒÂ¡lisis. |
| Media | Conservar HUD a resoluciÃƒÂ³n nativa o producir una segunda evidencia nativa. | Mejora la inspecciÃƒÂ³n forense de detalles pequeÃƒÂ±os. |
| Media | AÃƒÂ±adir modo streaming RTSP con supervisiÃƒÂ³n y polÃƒÂ­tica de latencia. | Lleva la soluciÃƒÂ³n de batch a operaciÃƒÂ³n en vivo. |
| Media | Dashboard de ocupaciÃƒÂ³n, permanencia y alertas por cÃƒÂ¡mara. | Hace los resultados directamente consumibles por operaciÃƒÂ³n. |
| Baja | AÃƒÂ±adir alertas de salud y rotaciÃƒÂ³n de artefactos. | Facilita operar mÃƒÂºltiples cÃƒÂ¡maras durante meses. |

## Decisiones a revisar

- `inference_rate` y `resolution_target` deben elegirse por cÃƒÂ¡mara con la
  combinaciÃƒÂ³n de F1/MOTA y SLA, no por un ÃƒÂºnico video.
- Los IDs de ByteTrack no son identidad: no deben usarse para asistencia,
  vigilancia individual ni decisiones automatizadas sobre personas.
- El envÃƒÂ­o a Supabase debe permanecer opcional y los artefactos locales deben
  conservarse durante el periodo de retenciÃƒÂ³n aprobado.

## Plan de madurez

1. Etiquetar una muestra representativa de cada cÃƒÂ¡mara y ejecutar validaciÃƒÂ³n.
2. Ajustar modelo, umbrales y zonas usando esa evidencia.
3. Publicar dashboard y retenciÃƒÂ³n de datos aprobada por seguridad/privacidad.
4. AÃƒÂ±adir streaming, observabilidad centralizada y pruebas de carga multicÃƒÂ¡mara.
