"""Runner de checks de accesibilidad WCAG 2.1 AA (P2).

Verifica que todas las combinaciones fg/bg efectivamente usadas por el
HUD (`src/accessibility/hud_renderer.py`) cumplan el contraste minimo
exigido (>= 4.5:1, WCAG 1.4.3). Se ejecuta como gate de CI
(`.github/workflows/accessibility.yml`) ademas de la suite pytest en
`tests/accessibility/`.
"""

from __future__ import annotations

import sys

from src.accessibility.contrast import contrast_ratio
from src.accessibility.hud_renderer import hud_color_combinations

MINIMUM_CONTRAST = 4.5


def main() -> int:
    failures = []
    for name, fg, bg in hud_color_combinations():
        ratio = contrast_ratio(fg, bg)
        if ratio < MINIMUM_CONTRAST:
            failures.append(f"{name}: {ratio:.2f} < {MINIMUM_CONTRAST}")

    for failure in failures:
        print(f"FAIL contraste HUD: {failure}", file=sys.stderr)

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
