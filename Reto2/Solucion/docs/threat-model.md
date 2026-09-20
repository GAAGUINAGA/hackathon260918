# Modelo de amenazas — Fase 6

## Alcance

La revisión cubre API HTTP/WebSocket, JWT, PostgreSQL, Outbox y el adaptador
Google. Los flujos CSV/vCard y de exportación aún no tienen endpoint ni worker;
su control de fórmula queda implementado y probado como utilidad reutilizable.

| Amenaza | Control implementado | Verificación |
| --- | --- | --- |
| IDOR / cruce de propietarios | `owner_id` desde JWT y RLS `FORCE` con `WITH CHECK` | e2e API e integración RLS |
| Inyección SQL | Drizzle parametrizado; Semgrep prohíbe SQL interpolado | CI: Semgrep |
| SSRF desde integración | origen fijo `people.googleapis.com` y `people/<id>` canónico antes de `fetch` | prueba sin llamada de red |
| Inyección CSV | `neutralizeCsvFormula` antepone `'` a `=`, `+`, `-` o `@` | prueba unitaria; aplicar en UC-07/UC-18 |
| Fuga de tokens / PII | AES-256-GCM, errores sanitizados y Gitleaks | cripto, e2e y CI |
| JWT falsificado o vencido | JWKS, firma, emisor, audiencia, vigencia y `sub` | e2e con JWKS local |
| Abuso de API | rate limit global y WebSocket autenticado | e2e y prueba de gateway |

## Límites operativos

- El seed usa únicamente `example.test`, nombres ficticios y teléfonos de
  prueba; no se ejecuta automáticamente.
- En un proxy/LB, configure `TRUST_PROXY` con IP/CIDR de confianza. No use
  `true` salvo que todo el trayecto sea confiable.
- Exponer UC-07/UC-18 exigirá ampliar este modelo y sus pruebas.
