from __future__ import annotations

import hashlib
from pathlib import Path

import pytest

from src.core.errors import ModelIntegrityError
from src.security.model_integrity import verify_sha256


def _write_artifact(path: Path, content: bytes) -> str:
    path.write_bytes(content)
    return hashlib.sha256(content).hexdigest()


def test_verify_sha256_accepts_matching_hash(tmp_path: Path) -> None:
    artifact = tmp_path / "model.bin"
    digest = _write_artifact(artifact, b"modelo-real")
    sums = tmp_path / "SHA256SUMS"
    sums.write_text(f"{digest}  model.bin\n", encoding="utf-8")

    verify_sha256(artifact, sums)


def test_verify_sha256_rejects_tampered_artifact(tmp_path: Path) -> None:
    artifact = tmp_path / "model.bin"
    digest = _write_artifact(artifact, b"modelo-real")
    sums = tmp_path / "SHA256SUMS"
    sums.write_text(f"{digest}  model.bin\n", encoding="utf-8")

    artifact.write_bytes(b"modelo-manipulado")

    with pytest.raises(ModelIntegrityError):
        verify_sha256(artifact, sums)


def test_verify_sha256_aborts_when_sums_file_missing(tmp_path: Path) -> None:
    artifact = tmp_path / "model.bin"
    _write_artifact(artifact, b"modelo-real")

    with pytest.raises(ModelIntegrityError):
        verify_sha256(artifact, tmp_path / "SHA256SUMS")


def test_verify_sha256_aborts_when_artifact_missing(tmp_path: Path) -> None:
    sums = tmp_path / "SHA256SUMS"
    sums.write_text("deadbeef  model.bin\n", encoding="utf-8")

    with pytest.raises(ModelIntegrityError):
        verify_sha256(tmp_path / "model.bin", sums)


def test_verify_sha256_aborts_when_entry_missing(tmp_path: Path) -> None:
    artifact = tmp_path / "model.bin"
    _write_artifact(artifact, b"modelo-real")
    sums = tmp_path / "SHA256SUMS"
    sums.write_text("deadbeef  otro-archivo.bin\n", encoding="utf-8")

    with pytest.raises(ModelIntegrityError):
        verify_sha256(artifact, sums)
