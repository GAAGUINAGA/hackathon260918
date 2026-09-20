# Retrospectiva y mejoras priorizadas

## Contexto de evaluación

**Reto 2 — puntaje de referencia recibido: 18 / 100.** Este documento no
inventa un desglose de la calificación; analiza brechas observables entre el
enunciado y el alcance realmente disponible para el usuario.

## Lo que quedó bien encaminado

- Arquitectura por anillos, puertos y reglas mecánicas de dependencia.
- Modelo relacional extensible, con aislamiento por propietario y RLS.
- Buenas bases de seguridad: JWT/JWKS, cifrado, validación, rate limit, SAST y
  datos sintéticos.
- Pruebas unitarias, integración, e2e y accesibilidad automatizada.
- Contrato OpenAPI como frontera entre backend y clientes.

## Brechas que limitan el valor demostrable

| Prioridad | Brecha | Consecuencia para la evaluación y el usuario | Mejora concreta |
| --- | --- | --- | --- |
| P0 | La UI solo muestra login, lista, creación y detalle | No existe una experiencia de centralización/migración visible | Diseñar navegación y flujos de Integraciones, Importar, Duplicados y Configuración |
| P0 | Google no está conectado de extremo a extremo | El adaptador no produce una migración utilizable | Implementar OAuth PKCE, callback, cuenta integrada, worker y sync inicial |
| P0 | Outlook/Microsoft Graph no existe | No se cumple la estrategia multi-fuente demostrable | Implementar adaptador Graph y delta sync después de Google |
| P0 | CSV/vCard no tienen endpoint ni worker | No hay alternativa de migración sin OAuth | Implementar carga temporal, mapeo, streaming, reporte y deduplicación |
| P1 | CRUD está incompleto | Faltan actualizar, retiro, restauración, categorías y etiquetas en la experiencia | Completar UC de modificación y papelera con control de versión |
| P1 | Duplicados no tienen interfaz de revisión | El motor determinista no genera valor visible | Mostrar candidatos, señales, decisiones y fusión reversible |
| P1 | Documentación anterior sugería mayor cobertura que la disponible | Riesgo de expectativas incorrectas | Mantener tablas explícitas de “implementado / parcial / pendiente” |
| P2 | Bundle web supera 500 kB | Afecta rendimiento inicial, no funcionalidad | Dividir por rutas y cargar cliente/integraciones bajo demanda |
| P2 | Consulta de lista presenta N+1 | Escala peor con listas grandes | Proyectar email/teléfono principal en una consulta o agregación |

## Lecciones

1. Un diseño sólido no reemplaza un flujo completo que el usuario pueda usar.
2. La planificación por fases debe mapearse a casos de uso visibles y criterios
   de aceptación verificables, no solo a capas técnicas.
3. La documentación debe declarar límites reales. “Preparado para” no equivale
   a “implementado”.
4. Para un reto de integración, la demo debe priorizar una migración funcional
   pequeña de extremo a extremo antes de ampliar infraestructura.

## Plan de recuperación sugerido

El objetivo inmediato no es IA. Es entregar una ruta demostrable:

1. Importar un CSV de Google u Outlook.
2. Ver progreso, filas fallidas y contactos creados.
3. Revisar duplicados sugeridos.
4. Conectar una cuenta Google de prueba y ejecutar una sincronización inicial.
5. Documentar una demo de cinco minutos con datos sintéticos y una cuenta de
   prueba autorizada.

Una vez demostrada esa ruta, se puede extender a Microsoft Graph, sincronización
incremental y, solo después, capacidades de IA.
