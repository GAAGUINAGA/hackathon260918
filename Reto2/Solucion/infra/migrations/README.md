# infra/migrations

Migraciones versionadas de Drizzle ORM para las 16 tablas activas
(planeacion_v.2.1.2 §ADR-02, §ADR-03).

**Estado:** carpeta reservada en Fase 0. Las migraciones se generan en
Fase 3 (Anillo 2), con RLS `FORCE` + `WITH CHECK`, `state boolean NOT NULL
DEFAULT true` en las 14 tablas sujetas a ADR-21, e indices unicos parciales
`WHERE state` (RT-16).
