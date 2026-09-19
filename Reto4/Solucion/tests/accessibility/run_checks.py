"""Runner de checks de accesibilidad WCAG 2.1 AA (P2).

Fase 0.5: sin artefactos visuales (HUD) que verificar todavia; existe para
que el gate de CI de accesibilidad sea ejecutable desde ahora. Fase 4
añade la verificacion real de contraste (src/accessibility/contrast.py)
sobre las combinaciones de color del HUD.
"""

from __future__ import annotations

import sys


def main() -> int:
    return 0


if __name__ == "__main__":
    sys.exit(main())
