"""Sanity de Fase 0: el entorno, la configuración y las fixtures obligatorias funcionan."""

from __future__ import annotations

from pathlib import Path

import reto5
from reto5.domain.errors import Reto5Error
from reto5.ports.llm import LLMPort
from reto5.utils.settings import Settings, cargar_yaml, get_settings


def test_paquete_tiene_version() -> None:
    assert reto5.__version__


def test_settings_default_es_sqlite() -> None:
    settings = get_settings()
    assert isinstance(settings, Settings)
    assert settings.reto5_persistence == "sqlite"


def test_config_yaml_carga(tmp_path: Path) -> None:
    config = cargar_yaml("config.yaml")
    assert "ingesta" in config
    assert "ocr" in config


def test_errores_de_dominio_heredan_de_reto5error() -> None:
    from reto5.domain.errors import DocumentoInvalidoError

    assert issubclass(DocumentoInvalidoError, Reto5Error)


async def test_fake_llm_no_toca_red(fake_llm: LLMPort) -> None:
    respuesta = await fake_llm.completar("hola")
    assert "fake-llm" in respuesta


def test_fake_ocr_devuelve_texto(fake_ocr) -> None:
    assert fake_ocr.extraer_texto(Path("doc_0001.pdf"))


def test_fake_nlp_clasifica_deterministico(fake_nlp) -> None:
    categoria, confianza = fake_nlp.clasificar("texto de prueba")
    assert categoria == "otro"
    assert 0 <= confianza <= 1


def test_fake_chunker_fragmenta(fake_chunker) -> None:
    fragmentos = fake_chunker.fragmentar("a" * 25, tamano_maximo=10)
    assert len(fragmentos) == 3


def test_persistence_backend_parametrizado(persistence_backend: str) -> None:
    assert persistence_backend in {"sqlite", "supabase"}
