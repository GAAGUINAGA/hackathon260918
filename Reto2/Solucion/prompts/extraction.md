# Prompt: extraction

**Estado:** Diferido a Fase 7 (ADR-20). Redactado como reserva arquitectonica;
sin ejecucion en las fases F1-F6. Ningun caso de uso de esta version invoca
`LlmPort`.

Proposito previsto: extraccion de entidades (nombre, empresa, cargo, correo,
telefono) desde texto libre importado, para sugerir campos de un contacto.
Salida estructurada exigida via esquema `zod` estricto (un reintento con
correccion, luego descarte). Se redacta en detalle al iniciar la Fase 7.
