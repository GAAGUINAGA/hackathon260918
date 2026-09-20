# Declaración de accesibilidad

## Conformidad

El HUD y la documentación se diseñaron con referencia a WCAG 2.1 AA. Las
pruebas automatizadas verifican contraste mínimo 4.5:1. Cada track incluye un
identificador textual, por lo que el color no es su único canal. No hay
destellos ni animaciones.

## Alternativas

`events.csv` y `events.jsonl` son el equivalente textual UTF-8 de las alertas
visuales. `metrics.json` describe el desempeño sin depender del video.

## Límite conocido

El video anotado no incorpora audiodescripción; para operación debe revisarse
junto a eventos y tracks. La responsable debe validar capturas reales y
conservar la evidencia de `tests/accessibility`.
