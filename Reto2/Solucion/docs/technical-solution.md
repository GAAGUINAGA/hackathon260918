# Documentación técnica — SSOT Contacts

## Propósito

SSOT Contacts centraliza contactos de un usuario en un modelo propio y
extensible. PostgreSQL es la fuente de verdad; proveedores como Google no
deben convertirse en dueños del dato. El proyecto prioriza aislamiento por
propietario, trazabilidad y una base preparada para integraciones futuras.

## Alcance real de la versión actual

| Capacidad | Estado | Evidencia principal |
| --- | --- | --- |
| Crear contacto local | Implementada | `POST /v1/contacts` |
| Listar, buscar y paginar contactos | Implementada | `GET /v1/contacts` |
| Consultar resumen por ID | Implementada | `GET /v1/contacts/:id` |
| Login delegado | Implementada | Supabase Auth + JWT/JWKS |
| Consola web y cliente móvil | Implementados | login, lista, creación y detalle |
| Modelo de datos multi-fuente | Implementado | esquema Drizzle y 16 tablas activas |
| RLS, Outbox y cifrado de tokens | Implementados | migraciones e infraestructura |
| Adaptador de Google People | Parcial | mapea lecturas/escrituras, no está cableado a OAuth/UI/worker |
| Importar CSV/vCard | No implementado | solo existe la defensa reutilizable contra fórmulas CSV |
| Microsoft Graph / Outlook | No implementado | puerto definido; adaptador diferido |
| Sincronización completa o incremental | No implementada de extremo a extremo | base de datos y puertos preparados |
| IA, embeddings y pgvector | No implementados deliberadamente | Fase 7 diferida |

La tabla evita una ambigüedad importante: que existan puertos, tablas o
adaptadores aislados no significa que el flujo de producto esté disponible al
usuario final.

## Arquitectura

```text
Web React / Móvil Flutter
          │ OpenAPI + JWT
          ▼
API NestJS + Fastify ── WebSocket autenticado
          │
          ▼
Aplicación: casos de uso, ActorContext y puertos
          │
          ▼
Dominio: Contact, Value Objects, deduplicación determinista
          │
          ▼
Infraestructura: Drizzle/PostgreSQL, RLS, Outbox, Redis, Google People
```

- **Dominio:** no importa HTTP, SQL ni SDKs. Email y teléfono se construyen
  mediante Value Objects; la normalización aplica NFKC, eliminación de acentos
  y E.164.
- **Aplicación:** exige `ActorContext`; el `ownerId` no puede llegar como un
  parámetro arbitrario del cliente.
- **Infraestructura:** implementa repositorios, consultas, transacciones con
  `SET LOCAL app.current_user_id`, cifrado AES-256-GCM y relé Outbox.
- **Interfaz:** valida requests con Zod, serializa DTOs con exclusión explícita
  y delega identidad a Supabase.

Las reglas se verifican con TypeScript, ESLint, Semgrep y dependency-cruiser.

## Modelo de datos

`contacts` es el agregado raíz: nombre visible, empresa, cargo, notas, estado,
versión y fechas. Sus datos repetibles se normalizan en tablas separadas:

| Área | Tablas | Decisión |
| --- | --- | --- |
| Identificadores | `contact_emails`, `contact_phones` | varios valores, principal, bloqueo manual y claves normalizadas para deduplicación |
| Ubicación | `contact_addresses` | dirección etiquetada y repetible |
| Organización | `tags`, `categories`, tablas de enlace | clasificación por propietario, sin acoplarla al contacto |
| Integración | `integration_accounts`, `contact_links` | cuenta y referencia remota separadas del contacto local |
| Trazabilidad | `contact_revisions`, `merge_operations` | historial inmutable y reservas para operaciones de fusión |
| Procesamiento | `outbox`, `jobs`, `duplicate_candidates` | eventos, tareas y candidatos de deduplicación |
| Preferencias | `user_preferences` | región, idioma, zona horaria y modo de IA futuro |

Cada tabla de negocio contiene `owner_id`, `state` y timestamps cuando aplica.
La separación permite representar datos de Google, Outlook, iCloud, CSV o
vCard sin cambiar el núcleo del contacto.

## API disponible

La API se documenta al ejecutar el servidor en `http://localhost:3000/docs`.
Todas las rutas requieren `Authorization: Bearer <access_token>` válido de
Supabase.

| Método | Ruta | Uso actual |
| --- | --- | --- |
| `POST` | `/v1/contacts` | crear un contacto con nombre, correos y/o teléfonos |
| `GET` | `/v1/contacts` | listar; admite búsqueda, cursor y límite |
| `GET` | `/v1/contacts/:id` | consultar resumen de un contacto propio |

Ejemplo de creación:

```bash
curl -X POST http://localhost:3000/v1/contacts \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Ada Demo","emails":[{"raw":"ada@example.test","isPrincipal":true}]}'
```

No están disponibles aún endpoints de edición, retiro, importación, exportación,
vinculación OAuth ni sincronización. Deben presentarse como trabajo pendiente,
no como funcionalidades de la demo.

## Seguridad

- JWT validado contra JWKS de Supabase; la API no crea ni firma tokens.
- `owner_id` derivado exclusivamente del claim `sub` y RLS `FORCE` + `WITH
  CHECK` en PostgreSQL.
- Tokens de proveedores diseñados para cifrado AES-256-GCM.
- Errores internos sanitizados; respuestas DTO con campos expuestos de forma
  explícita.
- Limitación global de tasa y WebSocket autenticado durante el handshake.
- Semgrep bloquea SQL interpolado y `dangerouslySetInnerHTML`; Gitleaks revisa
  secretos en CI.
- El [modelo de amenazas](threat-model.md) documenta controles de SSRF, CSV,
  SQLi, JWT, PII y abuso de API.

## Calidad y verificación

La verificación local contempla lint, build, typecheck, reglas de dependencia,
pruebas unitarias, integración con PostgreSQL, e2e de API y pruebas Flutter.
Las pruebas de integración se ejecutan sin paralelismo entre archivos porque el
relé Outbox opera sobre una cola global.

La ejecución detallada está en el [README](../README.md#instalación-y-ejecución-local).
