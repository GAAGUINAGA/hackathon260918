"""Configuración de la aplicación vía variables de entorno y config.yaml."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

import yaml
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PersistenceMode = Literal["sqlite", "supabase-local", "supabase-cloud"]

CONFIG_DIR = Path(__file__).resolve().parents[3] / "config"


class Settings(BaseSettings):
    """Variables de entorno del proyecto. Ver .env.example."""

    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    reto5_persistence: PersistenceMode = Field(default="sqlite")
    reto5_sqlite_path: str = Field(default="data/auditoria.db")

    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None
    supabase_db_url: str | None = None
    supabase_storage_bucket: str = "documents"

    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    openai_api_key: str | None = None
    anthropic_api_key: str | None = None

    reto5_watch_dir: str = "./Documentos"
    reto5_output_dir: str = "./data/organizado"


def cargar_yaml(nombre: str) -> dict[str, object]:
    """Carga un archivo YAML de config/ por nombre de archivo."""
    ruta = CONFIG_DIR / nombre
    with ruta.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def get_settings() -> Settings:
    return Settings()
