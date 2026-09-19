# Declaracion de Accesibilidad — Motor Analitico Edge

**Estado:** Borrador (Fase 0.5) — se completa en Fase 6 con evidencia de
verificacion.

## Norma de referencia

WCAG 2.1, Nivel AA. Ver `.claude/planeacion_v1.2.0.md` Sec.10 para el
detalle por tipo de artefacto.

## Artefactos con interfaz humana en este proyecto

| Artefacto | Aplica desde | Criterios clave |
|---|---|---|
| Video anotado (HUD) | Fase 4 | 1.4.1 (no depender solo del color), 1.4.3 (contraste >= 4.5:1), 2.3.1 (sin destellos > 3 Hz), 1.1.1 (equivalente textual en `events.csv`) |
| `events.csv` / `metrics.json` | Fase 4 | Encoding UTF-8 sin BOM, headers descriptivos, doc de esquema (`docs/schema/events.md`) |
| Documentacion (README, docs/) | Continuo | Estructura semantica, texto alternativo en diagramas, enlaces descriptivos |

## Estado actual (Fase 0.5)

- `src/accessibility/contrast.py` y `src/accessibility/hud_renderer.py`
  existen como stubs tipados; la implementacion y su verificacion de
  contraste llegan en Fase 4.
- No hay todavia artefactos de video ni dashboards que auditar.
- Esta declaracion se actualiza fase a fase; la version final (Fase 6)
  incluye resultados de la verificacion de contraste sobre el HUD real.

## Conformidad declarada

**Parcial.** No aplicable aun a nivel AA porque los artefactos con
interfaz humana visual (HUD, dashboard) no existen todavia. La
documentacion tecnica del proyecto (este archivo, `README.md`,
`SECURITY.md`) sigue una estructura semantica en Markdown.
