"""Utilidades de contraste WCAG 2.1 AA (P2, planeacion_v1.2.0.md Sec.10.1).

Stub de Fase 0.5. Implementacion completa en Fase 4 (src/accessibility/
hud_renderer.py): calculo de ratio de contraste (WCAG) y ajuste automatico
de color de primer plano hasta alcanzar >= 4.5:1.
"""

from __future__ import annotations

RGBColor = tuple[int, int, int]


def contrast_ratio(fg: RGBColor, bg: RGBColor) -> float:
    """Debe calcular el ratio de contraste WCAG entre fg y bg."""
    raise NotImplementedError("implementado en Fase 4 (CU-03.3)")


def ensure_contrast(fg: RGBColor, bg: RGBColor, minimum: float = 4.5) -> RGBColor:
    """Debe devolver un color derivado de fg que cumpla el minimo contra bg."""
    raise NotImplementedError("implementado en Fase 4 (CU-03.3)")
