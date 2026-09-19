from __future__ import annotations

import pytest

from src.accessibility import contrast, hud_renderer


def test_contrast_ratio_not_yet_implemented() -> None:
    with pytest.raises(NotImplementedError):
        contrast.contrast_ratio((255, 255, 255), (0, 0, 0))


def test_ensure_contrast_not_yet_implemented() -> None:
    with pytest.raises(NotImplementedError):
        contrast.ensure_contrast((255, 255, 255), (0, 0, 0))


def test_render_hud_not_yet_implemented() -> None:
    with pytest.raises(NotImplementedError):
        hud_renderer.render_hud(frame=None, tracks=[])
