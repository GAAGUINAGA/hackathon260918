# ADR-017: Supabase local-first para desarrollo

## Contexto
Depender de Supabase cloud para desarrollo introduce latencia de red, cuotas y fallos externos.

## Decisión
Usar `supabase start` (Docker local) para todo el desarrollo y tests de integración.
Cloud solo para despliegue final y CI remoto opcional.

## Consecuencias
Desarrollo offline, reproducible, sin costos de red. Requiere Docker instalado.
Las migraciones deben ser idempotentes y aplicables a ambos entornos.
