"""Fixtures compartidas. Ningún test aquí definido toca un LLM real."""

from __future__ import annotations

import os
from pathlib import Path

import pytest
import vcr as vcrpy

from reto5.ports.chunker import ChunkerPort
from reto5.ports.llm import LLMPort
from reto5.ports.nlp import Entidad, NLPPort
from reto5.ports.ocr import OCRPort

CASSETTES_DIR = Path(__file__).parent / "fixtures" / "cassettes"


class FakeLLM(LLMPort):
    """Respuestas deterministas en memoria. Nunca toca red."""

    async def completar(self, prompt: str, *, max_tokens: int = 512) -> str:
        return f"[fake-llm max_tokens={max_tokens}] {prompt[:80]}"


class FakeOCR(OCRPort):
    """Devuelve texto fijo para rutas conocidas."""

    def __init__(self, respuestas: dict[str, str] | None = None) -> None:
        self._respuestas = respuestas or {}

    def extraer_texto(self, ruta: Path) -> str:
        return self._respuestas.get(ruta.name, f"[fake-ocr] {ruta.name}")


class FakeNLP(NLPPort):
    """NER y clasificación deterministas."""

    def extraer_entidades(self, texto: str) -> list[Entidad]:
        return []

    def clasificar(self, texto: str) -> tuple[str, float]:
        return ("otro", 0.99)


class FakeChunker(ChunkerPort):
    """Chunking fijo, sin modelo."""

    def fragmentar(self, texto: str, *, tamano_maximo: int = 1000) -> list[str]:
        if not texto:
            return []
        return [texto[i : i + tamano_maximo] for i in range(0, len(texto), tamano_maximo)]


@pytest.fixture
def fake_llm() -> LLMPort:
    """FakeLLM determinista. Nunca toca red."""
    return FakeLLM()


@pytest.fixture
def fake_ocr() -> OCRPort:
    """Devuelve texto fijo para rutas conocidas."""
    return FakeOCR()


@pytest.fixture
def fake_nlp() -> NLPPort:
    """NER y clasificación deterministas."""
    return FakeNLP()


@pytest.fixture
def fake_chunker() -> ChunkerPort:
    """Chunking fijo, sin modelo."""
    return FakeChunker()


@pytest.fixture
def vcr() -> vcrpy.VCR:
    """Instancia VCR configurada contra tests/fixtures/cassettes/. No graba en CI."""
    return vcrpy.VCR(
        cassette_library_dir=str(CASSETTES_DIR),
        record_mode="none",
        match_on=["method", "path"],
    )


@pytest.fixture
def vcr_llm(vcr: vcrpy.VCR):
    """Cassette reproducible para LLM remoto."""
    with vcr.use_cassette("llm/analizar.yaml"):
        yield


@pytest.fixture(params=["sqlite", "supabase"])
def persistence_backend(request: pytest.FixtureRequest) -> str:
    """Parametriza tests de persistencia. 'supabase' se omite si no hay Supabase local."""
    modo = request.param
    if modo == "supabase" and not os.environ.get("SUPABASE_DB_URL"):
        pytest.skip("Supabase local no disponible (SUPABASE_DB_URL no definida)")
    return modo
