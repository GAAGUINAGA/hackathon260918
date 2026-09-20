"""Excepciones tipificadas y exit codes del motor (fail-secure, P1).

Cada excepcion mapea a un ExitCode fijo para que scripts/run_batch.py
(Fase 6) pueda salir con un codigo coherente en vez de degradar
silenciosamente (planeacion_v1.2.0.md Sec.9.2).
"""

from __future__ import annotations

from enum import IntEnum


class ExitCode(IntEnum):
    SUCCESS = 0
    INGEST_FAIL = 10
    CONFIG_INVALID = 11
    TIMEOUT = 12
    ANALYTICS_CRASH = 13
    INCOMPLETE_OUTPUT = 14
    TELEMETRY_FAIL = 15
    RENDER_FAIL = 16
    SLA_VIOLATION = 17
    MODEL_INTEGRITY_FAIL = 18


class PipelineError(Exception):
    exit_code: ExitCode = ExitCode.SUCCESS


class ConfigError(PipelineError):
    exit_code = ExitCode.CONFIG_INVALID


class IngestError(PipelineError):
    exit_code = ExitCode.INGEST_FAIL


class PipelineTimeoutError(PipelineError):
    exit_code = ExitCode.TIMEOUT


class ModelIntegrityError(PipelineError):
    exit_code = ExitCode.MODEL_INTEGRITY_FAIL


class TrackerConfigError(ConfigError):
    """Config de tracking prohibida por P1 (CU-01.3 FE-01, CU-04.1 FE-03)."""


class RenderError(PipelineError):
    exit_code = ExitCode.RENDER_FAIL


class TelemetryError(PipelineError):
    exit_code = ExitCode.TELEMETRY_FAIL


class AnalyticsCrashError(PipelineError):
    """AnalyticsProcess termino con codigo de salida distinto de 0 (CU-04.2)."""

    exit_code = ExitCode.ANALYTICS_CRASH
