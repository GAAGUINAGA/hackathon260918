"""Redaccion de PII en logs y eventos (P1/P2, CU-06.3).

Stub de Fase 0.5. Implementacion completa en Fase 4 (src/telemetry/events.py,
src/utils/logging.py): filtro regex de paths absolutos, IPs, MACs, emails;
integracion con el logger JSON estructurado.
"""

from __future__ import annotations


def redact(message: str) -> str:
    """Debe reemplazar paths absolutos, IPs, MACs y emails por <redacted>."""
    raise NotImplementedError("implementado en Fase 4 (CU-06.3)")
