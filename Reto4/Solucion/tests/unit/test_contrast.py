from __future__ import annotations

import itertools

from src.accessibility.contrast import contrast_ratio, ensure_contrast

_PALETTE = [
    (0, 0, 0),
    (255, 255, 255),
    (0, 200, 0),
    (200, 0, 0),
    (0, 0, 200),
    (128, 128, 128),
    (255, 255, 0),
]


def test_contrast_ratio_black_on_white_is_maximum() -> None:
    assert contrast_ratio((0, 0, 0), (255, 255, 255)) == 21.0


def test_contrast_ratio_identical_colors_is_minimum() -> None:
    assert contrast_ratio((100, 100, 100), (100, 100, 100)) == 1.0


def test_contrast_ratio_is_symmetric() -> None:
    fg, bg = (30, 60, 90), (200, 150, 100)
    assert contrast_ratio(fg, bg) == contrast_ratio(bg, fg)


def test_ensure_contrast_returns_input_unchanged_when_already_compliant() -> None:
    fg, bg = (0, 0, 0), (255, 255, 255)
    assert ensure_contrast(fg, bg) == fg


def test_ensure_contrast_adjusts_low_contrast_color_to_meet_minimum() -> None:
    fg, bg = (120, 120, 120), (100, 100, 100)
    assert contrast_ratio(fg, bg) < 4.5

    adjusted = ensure_contrast(fg, bg)

    assert contrast_ratio(adjusted, bg) >= 4.5


def test_ensure_contrast_meets_minimum_over_full_palette_combinations() -> None:
    for fg, bg in itertools.product(_PALETTE, repeat=2):
        adjusted = ensure_contrast(fg, bg, minimum=4.5)
        assert contrast_ratio(adjusted, bg) >= 4.5
