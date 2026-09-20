from __future__ import annotations

import numpy as np

from src.accessibility.contrast import contrast_ratio
from src.accessibility.hud_renderer import hud_color_combinations, render_hud

MINIMUM_CONTRAST = 4.5


def test_all_declared_hud_color_combinations_meet_minimum_contrast() -> None:
    combinations = hud_color_combinations()
    assert combinations  # el HUD debe declarar al menos una combinacion

    for name, fg, bg in combinations:
        assert contrast_ratio(fg, bg) >= MINIMUM_CONTRAST, name


def test_render_hud_does_not_mutate_the_original_frame() -> None:
    frame = np.zeros((120, 120, 3), dtype=np.uint8)
    original = frame.copy()
    tracks = [{"track_id": 7, "bbox_xyxy": (10.0, 10.0, 60.0, 100.0)}]

    render_hud(frame, tracks)

    assert np.array_equal(frame, original)


def test_render_hud_draws_a_visible_label_for_each_track() -> None:
    frame = np.zeros((120, 120, 3), dtype=np.uint8)
    tracks = [{"track_id": 3, "bbox_xyxy": (10.0, 10.0, 60.0, 100.0)}]

    annotated = render_hud(frame, tracks)

    assert annotated.shape == frame.shape
    assert not np.array_equal(annotated, frame)


def test_render_hud_label_includes_textual_track_id_not_just_color() -> None:
    # WCAG 1.4.1: el identificador no puede depender solo del color, debe
    # existir un elemento textual (`ID:<n>`) -- se verifica indirectamente
    # comprobando que dos tracks con distinto id producen anotaciones
    # distintas incluso con la misma bbox/color.
    frame = np.zeros((120, 120, 3), dtype=np.uint8)
    bbox = (10.0, 10.0, 60.0, 100.0)

    annotated_a = render_hud(frame, [{"track_id": 1, "bbox_xyxy": bbox}])
    annotated_b = render_hud(frame, [{"track_id": 22, "bbox_xyxy": bbox}])

    assert not np.array_equal(annotated_a, annotated_b)


def test_render_hud_draws_zone_borders_when_provided() -> None:
    frame = np.zeros((120, 120, 3), dtype=np.uint8)
    zones = [
        {
            "name": "lobby",
            "polygon_xy": [(5.0, 5.0), (100.0, 5.0), (100.0, 100.0), (5.0, 100.0)],
        }
    ]

    annotated = render_hud(frame, tracks=[], zones=zones)

    assert not np.array_equal(annotated, frame)
