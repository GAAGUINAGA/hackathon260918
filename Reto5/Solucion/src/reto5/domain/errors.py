"""Excepciones del dominio de Reto 5."""

from __future__ import annotations


class Reto5Error(Exception):
    """Base de todas las excepciones del dominio."""


class DocumentoInvalidoError(Reto5Error):
    """El documento no puede procesarse (corrupto, vacío, formato no soportado)."""


class DocumentoDuplicadoError(Reto5Error):
    """El documento ya existe según su hash SHA-256."""


class ExtraccionFallidaError(Reto5Error):
    """La extracción de texto (nativa u OCR) no produjo resultado utilizable."""


class ClasificacionFallidaError(Reto5Error):
    """No fue posible determinar una categoría con confianza suficiente."""


class PersistenciaError(Reto5Error):
    """Error de la capa de persistencia (SQLite o Supabase)."""


class BloqueoConcurrenciaError(Reto5Error):
    """No se pudo adquirir el lock de archivo o de base de datos."""


class ConfiguracionInvalidaError(Reto5Error):
    """La configuración cargada no cumple el esquema esperado."""
