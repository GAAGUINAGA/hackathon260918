"""HUD accesible sobre el video anotado (P2, CU-03.3).

Cada persona trackeada se dibuja con: (1) un recuadro (nunca el unico
portador de significado, WCAG 1.4.1), (2) una etiqueta textual `ID:<n>`
(mas nombres de zona si aplica) sobre un fondo solido cuyo color de texto
se calcula con `ensure_contrast` para cumplir >= 4.5:1 (WCAG 1.4.3).
El HUD es estatico por frame -- sin animacion ni parpadeo (WCAG 2.3.1) --
y siempre redundante respecto de `events.csv` (WCAG 1.1.1): nunca es la
unica fuente de un dato.

Los bordes de zona (si se pasan) se dibujan con un halo blanco+negro
(doble trazo) en vez de un unico color, para sostener >= 3:1 de contraste
(WCAG 1.4.11) sin depender del contenido del frame de fondo.
"""

from __future__ import annotations

import cv2
import numpy as np

from src.accessibility.contrast import RGBColor, ensure_contrast

BOX_COLOR: RGBColor = (0, 200, 0)
LABEL_BACKGROUND: RGBColor = (0, 0, 0)
LABEL_MIN_CONTRAST = 4.5
LABEL_TEXT: RGBColor = ensure_contrast(
    (255, 255, 255), LABEL_BACKGROUND, LABEL_MIN_CONTRAST
)

_FONT = cv2.FONT_HERSHEY_SIMPLEX
_FONT_SCALE = 0.5
_FONT_THICKNESS = 1
_LABEL_PADDING = 4
_ZONE_HALO_COLOR: RGBColor = (255, 255, 255)
_ZONE_LINE_COLOR: RGBColor = (0, 0, 0)


def hud_color_combinations() -> list[tuple[str, RGBColor, RGBColor]]:
    """Combinaciones fg/bg efectivamente usadas por el HUD (para CI/tests)."""
    return [("label_text_on_label_background", LABEL_TEXT, LABEL_BACKGROUND)]


def _to_bgr(color: RGBColor) -> tuple[int, int, int]:
    r, g, b = color
    return (b, g, r)


def _draw_track(frame: np.ndarray, track: dict[str, object]) -> None:
    bbox = track["bbox_xyxy"]
    assert isinstance(bbox, tuple)
    x1, y1, x2, y2 = (int(round(float(v))) for v in bbox)

    cv2.rectangle(frame, (x1, y1), (x2, y2), _to_bgr(BOX_COLOR), 2)

    label = f"ID:{track['track_id']}"
    zone_names = track.get("zone_names")
    if isinstance(zone_names, (list, tuple)) and zone_names:
        label += " " + ",".join(str(name) for name in zone_names)

    (text_w, text_h), _ = cv2.getTextSize(label, _FONT, _FONT_SCALE, _FONT_THICKNESS)
    label_top = max(y1 - text_h - 2 * _LABEL_PADDING, 0)
    label_bottom = label_top + text_h + 2 * _LABEL_PADDING
    cv2.rectangle(
        frame,
        (x1, label_top),
        (x1 + text_w + 2 * _LABEL_PADDING, label_bottom),
        _to_bgr(LABEL_BACKGROUND),
        cv2.FILLED,
    )
    cv2.putText(
        frame,
        label,
        (x1 + _LABEL_PADDING, label_bottom - _LABEL_PADDING),
        _FONT,
        _FONT_SCALE,
        _to_bgr(LABEL_TEXT),
        _FONT_THICKNESS,
        cv2.LINE_AA,
    )


def _draw_zone(frame: np.ndarray, zone: dict[str, object]) -> None:
    polygon_xy = zone["polygon_xy"]
    assert isinstance(polygon_xy, (list, tuple))
    points = np.array(
        [(int(round(x)), int(round(y))) for x, y in polygon_xy], dtype=np.int32
    ).reshape((-1, 1, 2))
    cv2.polylines(frame, [points], True, _to_bgr(_ZONE_HALO_COLOR), 4, cv2.LINE_AA)
    cv2.polylines(frame, [points], True, _to_bgr(_ZONE_LINE_COLOR), 2, cv2.LINE_AA)


def render_hud(
    frame: np.ndarray,
    tracks: list[dict[str, object]],
    zones: list[dict[str, object]] | None = None,
) -> np.ndarray:
    """Devuelve una copia anotada de `frame` (no muta el original)."""
    annotated = frame.copy()
    for zone in zones or []:
        _draw_zone(annotated, zone)
    for track in tracks:
        _draw_track(annotated, track)
    return annotated
