"""HUD accesible sobre el video anotado (P2, CU-03.3).

Stub de Fase 0.5. Implementacion completa en Fase 4: dibujo de bboxes con
etiqueta textual ID:<n> (sin depender solo del color), fondo semitransparente
para contraste >= 4.5:1, bordes de zona >= 3:1, sin destellos > 3 Hz.
"""

from __future__ import annotations

from typing import Any


def render_hud(frame: Any, tracks: list[dict[str, object]]) -> Any:
    """Debe devolver el frame anotado cumpliendo WCAG 2.1 AA Sec.10.1."""
    raise NotImplementedError("implementado en Fase 4 (CU-03.3)")
