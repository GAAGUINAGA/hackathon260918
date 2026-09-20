# Estrategia de integración y migración de contactos

## Estado actual

La aplicación **todavía no ofrece al usuario** botones o pantallas para migrar
Google u Outlook. Existe un `GooglePeopleAdapter` probado en infraestructura,
pero no están implementados el flujo OAuth de vinculación, endpoints, worker,
pantallas ni sincronización completa. Microsoft Graph, CSV y vCard tampoco
están conectados al producto.

Esta estrategia define el camino de implementación; no debe confundirse con
una capacidad ya entregada.

## Principios

1. El usuario autoriza cada proveedor; nunca entrega su contraseña a la
   plataforma.
2. Se solicitan scopes mínimos: lectura de contactos para migración; permisos
   de escritura solo si el usuario activa sincronización saliente.
3. El refresh token se cifra y no se expone a web o móvil.
4. Cada dato externo pasa por las mismas fábricas del dominio que los datos
   locales.
5. La importación genera candidatos de duplicado; no crea duplicados
   silenciosos ni hace fusiones automáticas sin una política explícita.
6. Los fallos por fila se reportan sin exponer trazas ni credenciales.

## Google Contacts

### Flujo propuesto

1. El usuario abre **Integraciones → Google → Conectar**.
2. La API exige MFA si corresponde, genera `state` aleatorio y PKCE
   (`code_verifier`/`code_challenge`) con TTL corto.
3. El navegador es redirigido a Google OAuth 2.0 con el scope mínimo de
   contactos y acceso offline.
4. El callback valida `state`, canjea el código y cifra el refresh token.
5. Se crea `integration_account` y un evento `sync.full` en Outbox dentro de
   la misma transacción.
6. Un worker consume páginas de Google People API, transforma personas a DTO
   canónico y persiste enlaces en `contact_links`.
7. Un `sync_token` permite solicitar cambios incrementales después de la
   importación inicial.

El adaptador actual ya usa una base fija de Google y valida `resourceName`
canónico antes de una actualización, mitigando SSRF. Aún falta cablear los
pasos anteriores.

### Acceso del organizador

Para una demostración se debe solicitar a los organizadores una cuenta Google
de prueba, o crear una cuenta específicamente para demo. Deben registrar las
redirect URIs locales/producción y entregar **solo** el Client ID y Client
Secret a través de un canal seguro. Nunca se versionan; viven en variables de
entorno.

## Outlook / Microsoft People

Se implementa con el mismo puerto `ContactProviderPort`, cambiando únicamente
el adaptador:

1. OAuth de Microsoft Identity Platform con permisos mínimos de contactos.
2. Lectura desde Microsoft Graph Contacts.
3. Uso de `delta` para sincronización incremental y manejo de token expirado.
4. Transformación al DTO canónico y persistencia idéntica a Google.

No existe adaptador Microsoft Graph en el repositorio actual. iCloud/CardDAV
debe tratarse como una extensión posterior siguiendo el mismo puerto.

## Importación por archivo: ruta de respaldo

La importación CSV/vCard permite migrar aun sin OAuth:

1. Usuario carga un archivo dentro de un límite de tamaño.
2. API valida tipo real, tamaño y codificación; conserva temporalmente con TTL.
3. Para CSV, el usuario confirma un mapeo de columnas detectado desde cabeceras.
4. Worker procesa en streaming, no carga el archivo completo en memoria.
5. Cada fila pasa por Value Objects de email/teléfono y se registra el número
   de línea cuando falla.
6. Los valores de fórmula se neutralizan en importación y exportación.
7. Al finalizar, se emite progreso, se genera reporte y se encola deduplicación.

`neutralizeCsvFormula` ya está probado, pero el flujo de archivo no existe aún.

## Orden recomendado de construcción

1. Endpoint y UI de importación CSV con reporte de errores.
2. OAuth + sincronización inicial de Google.
3. Pantalla de revisión de duplicados y conflictos.
4. Sincronización incremental de Google.
5. Adaptador Microsoft Graph y su flujo OAuth/delta.
6. vCard e iCloud/CardDAV si el alcance lo requiere.

Cada paso debe llevar API, worker, pruebas de seguridad, telemetría y una
pantalla accesible; un adaptador aislado no basta para completar la migración.
