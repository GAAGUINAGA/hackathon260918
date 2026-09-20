"""Utilidades de contraste WCAG 2.1 AA (P2, planeacion_v1.2.0.md Sec.10.1).

Implementa el calculo de contraste segun la formula WCAG 2.x (luminancia
relativa sRGB) y un ajuste automatico de color de primer plano: si `fg`
no cumple el minimo contra `bg`, se empuja hacia el extremo (negro o
blanco) que da mas contraste, hasta el primer punto que alcanza el
minimo, preservando la mayor proporcion posible del tono original.
"""

from __future__ import annotations

RGBColor = tuple[int, int, int]

_BLACK: RGBColor = (0, 0, 0)
_WHITE: RGBColor = (255, 255, 255)
_SEARCH_STEPS = 24


def _linearize(channel: int) -> float:
    c = channel / 255.0
    if c <= 0.03928:
        return c / 12.92
    return float(((c + 0.055) / 1.055) ** 2.4)


def _relative_luminance(color: RGBColor) -> float:
    r, g, b = color
    return 0.2126 * _linearize(r) + 0.7152 * _linearize(g) + 0.0722 * _linearize(b)


def contrast_ratio(fg: RGBColor, bg: RGBColor) -> float:
    """Ratio de contraste WCAG entre `fg` y `bg` (rango [1.0, 21.0])."""
    l_fg = _relative_luminance(fg)
    l_bg = _relative_luminance(bg)
    lighter, darker = max(l_fg, l_bg), min(l_fg, l_bg)
    return (lighter + 0.05) / (darker + 0.05)


def _mix(a: RGBColor, b: RGBColor, t: float) -> RGBColor:
    return (
        round(a[0] + (b[0] - a[0]) * t),
        round(a[1] + (b[1] - a[1]) * t),
        round(a[2] + (b[2] - a[2]) * t),
    )


def ensure_contrast(fg: RGBColor, bg: RGBColor, minimum: float = 4.5) -> RGBColor:
    """Devuelve un color derivado de `fg` que cumpla `minimum` contra `bg`.

    Si `fg` ya cumple, se devuelve sin cambios. En caso contrario se
    interpola (busqueda binaria) hacia el extremo negro o blanco -- el que
    de mayor contraste contra `bg` -- hasta el punto mas cercano a `fg`
    que sigue cumpliendo el minimo. El minimo exigible (4.5) siempre es
    alcanzable por al menos uno de los dos extremos contra cualquier `bg`.
    """
    if contrast_ratio(fg, bg) >= minimum:
        return fg

    target = _WHITE
    if contrast_ratio(_BLACK, bg) > contrast_ratio(_WHITE, bg):
        target = _BLACK

    lo, hi = 0.0, 1.0
    best = target
    for _ in range(_SEARCH_STEPS):
        mid = (lo + hi) / 2.0
        candidate = _mix(fg, target, mid)
        if contrast_ratio(candidate, bg) >= minimum:
            best = candidate
            hi = mid
        else:
            lo = mid

    if contrast_ratio(best, bg) < minimum:
        return target
    return best
