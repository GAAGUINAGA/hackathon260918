# apps/mobile — Anillo 4 (Flutter)

Cliente de consumo (Android, iOS; Web solo como respaldo — ADR-07), con
Riverpod, go_router y dio.

**Estado (Fase 5):** UC-01 (crear), UC-11 (buscar/listar) y UC-12 (detalle)
implementados, igual que `apps/web` — es la superficie que expone
`apps/api` hoy. UC-08 (login) delega en Supabase Auth.

## Generar el cliente de API (ADR-08)

`packages/ssot_api_client` se genera desde `packages/contracts/openapi.json`
con `openapi-generator` (plantilla `dart-dio`) y no se versiona (ver
`.gitignore`):

```bash
bash tool/generate_api_client.sh
```

Requiere Java (para el jar de `openapi-generator-cli`, descargado por
`npx` la primera vez) y se ejecuta automáticamente en CI antes de
`flutter test`.

## Ejecutar en local

```bash
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=https://<project-ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<anon-key> \
  --dart-define=API_BASE_URL=http://localhost:3000
```

Sin `SUPABASE_URL`/`SUPABASE_ANON_KEY` la app muestra una pantalla de
"Configuración incompleta" en vez de fallar en seco.

## Nota sobre Drift

La reserva original (`planeacion_v.2.1.2.md`) incluye Drift para caché
local. Ningún caso de uso implementado hoy exige persistencia offline, así
que se difiere (KISS): añadirlo sin un consumidor real sería
sobreingeniería. Revisar si UC-19 (progreso de trabajos) u otro caso de
uso futuro lo requiere.
