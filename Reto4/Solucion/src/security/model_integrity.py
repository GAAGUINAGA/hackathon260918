"""Verificacion de integridad de artefactos (P1, CU-06.1).

Spoofing (STRIDE, planeacion_v1.2.0.md Sec.9.1): un modelo sustituido
produce detecciones maliciosas. `SHA256SUMS` junto al artefacto es la
unica fuente de verdad; fail-secure si falta el archivo, falta la
entrada, o el hash no coincide.
"""

from __future__ import annotations

import hashlib
import hmac
from pathlib import Path

from src.core.errors import ModelIntegrityError

_CHUNK_SIZE = 1024 * 1024


def _sha256_of_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(_CHUNK_SIZE), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _expected_hash(sha256sums_path: Path, artifact_name: str) -> str:
    for line in sha256sums_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split(maxsplit=1)
        if len(parts) != 2:
            continue
        expected_hash, filename = parts
        filename = filename.lstrip("*")
        if filename == artifact_name:
            return expected_hash
    raise ModelIntegrityError(
        f"{sha256sums_path}: no hay entrada para '{artifact_name}'"
    )


def verify_sha256(artifact_path: Path, sha256sums_path: Path) -> None:
    if not sha256sums_path.is_file():
        raise ModelIntegrityError(f"SHA256SUMS ausente: {sha256sums_path}")
    if not artifact_path.is_file():
        raise ModelIntegrityError(f"artefacto ausente: {artifact_path}")

    expected = _expected_hash(sha256sums_path, artifact_path.name)
    actual = _sha256_of_file(artifact_path)

    if not hmac.compare_digest(expected, actual):
        raise ModelIntegrityError(
            f"{artifact_path}: hash SHA256 no coincide (esperado {expected}, "
            f"obtenido {actual})"
        )
