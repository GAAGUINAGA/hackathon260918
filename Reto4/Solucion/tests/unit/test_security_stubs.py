from __future__ import annotations

import pytest

from src.security import log_redaction


def test_redact_not_yet_implemented() -> None:
    with pytest.raises(NotImplementedError):
        log_redaction.redact("mensaje con path C:/Users/alguien")
