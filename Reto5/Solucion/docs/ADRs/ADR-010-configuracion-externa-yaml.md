# ADR-010: Configuración externa en YAML

## Contexto
Parámetros como umbrales de confianza, taxonomía, convención de nombres y ajustes
de concurrencia cambian con más frecuencia que el código.

## Decisión
Toda configuración vive en `config/*.yaml`, validada con Pydantic v2
(`pydantic-settings`); nunca se hardcodean rutas ni parámetros en `src/`.

## Consecuencias
Flexibilidad sin recompilar ni redeployar. Requiere que cada parámetro nuevo se
declare y valide explícitamente (rechazo de configuración inválida, ver UC-10).
