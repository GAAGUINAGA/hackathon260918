"""Redaccion de PII en logs y eventos (P1/P2, CU-06.3).

Filtra de cualquier mensaje de log/telemetria los datos que puedan
identificar maquinas o personas: rutas absolutas (revelan nombres de
usuario del SO), IPs, direcciones MAC y correos electronicos. Se aplica
antes de que el mensaje llegue a cualquier sink o handler (Information
disclosure, planeacion_v1.2.0.md Sec.9.1).
"""

from __future__ import annotations

import re

_REDACTED = "<redacted>"

_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_MAC_RE = re.compile(r"(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}")
_IPV4_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
_WINDOWS_PATH_RE = re.compile(
    r"[A-Za-z]:[\\/](?:[^\s\\/:*?\"<>|]+[\\/])*[^\s\\/:*?\"<>|]*"
)
_UNIX_PATH_RE = re.compile(r"(?:/[^\s/]+){2,}/?")

# Orden: MAC/email/IP primero (patrones mas especificos) y paths al final,
# para que un path que contenga un email no deje residuos parcialmente
# redactados.
_PATTERNS = (_MAC_RE, _EMAIL_RE, _IPV4_RE, _WINDOWS_PATH_RE, _UNIX_PATH_RE)


def redact(message: str) -> str:
    """Reemplaza paths absolutos, IPs, MACs y emails por ``<redacted>``."""
    redacted = message
    for pattern in _PATTERNS:
        redacted = pattern.sub(_REDACTED, redacted)
    return redacted
