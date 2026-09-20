"""Contrato del pipeline de ingesta (UC-01/UC-02). Se implementa en Fase 1.

Estos tests documentan la API esperada y fallan intencionalmente hasta que
exista la implementación (xfail no estricto: no rompen el CI de Fase 0).
"""

from __future__ import annotations

import pytest


@pytest.mark.xfail(reason="Fase 1: pendiente application.ingesta", strict=False)
def test_ingestar_documento_calcula_hash_y_persiste() -> None:
    from reto5.application.ingesta import ingestar_documento  # noqa: F401

    raise AssertionError("pendiente de implementación en Fase 1")


@pytest.mark.xfail(reason="Fase 1: pendiente application.extraccion", strict=False)
def test_extraer_texto_usa_ocr_cuando_no_hay_capa_nativa() -> None:
    from reto5.application.extraccion import extraer_texto  # noqa: F401

    raise AssertionError("pendiente de implementación en Fase 1")
