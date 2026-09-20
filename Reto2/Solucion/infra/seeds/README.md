# infra/seeds

Datos sintéticos, idempotentes y exclusivos para demostración local. No hay
PII, secretos ni tokens de proveedores.

Con PostgreSQL levantado y las migraciones ya aplicadas:

```bash
psql "$DATABASE_ADMIN_URL" -v ON_ERROR_STOP=1 -f infra/seeds/001_demo_synthetic.sql
```

El script crea dos propietarios ficticios. El primero (`11111111-1111-4111-8111-111111111111`)
tiene dos contactos y el segundo (`22222222-2222-4222-8222-222222222222`) uno para
demostrar aislamiento RLS. No ejecutar contra una base compartida o producción.
