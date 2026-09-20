"""Redaccion de PII en logs y eventos (P1/P2, CU-06.3).

Filtra de cualquier mensaje de log/telemetria los datos que puedan
identificar maquinas o personas: rutas absolutas (revelan nombres de
usuario del SO), IPs (v4/v6), direcciones MAC (con `:` o `-`) y correos
electronicos. Se aplica antes de que el mensaje llegue a cualquier sink
o handler (Information disclosure, planeacion_v1.2.0.md Sec.9.1).
"""

from __future__ import annotations

import re

_REDACTED = "<redacted>"

_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_MAC_COLON_RE = re.compile(r"(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}")
_MAC_DASH_RE = re.compile(r"(?:[0-9A-Fa-f]{2}-){5}[0-9A-Fa-f]{2}")
_IPV4_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
# IPv6: forma completa (>=4 grupos, sin "::") o comprimida (con "::" en
# cualquier posicion). Deliberadamente no exige RFC completo -- solo evita
# los falsos positivos obvios (p.ej. "14:23:05" no tiene "::" ni >=4 grupos).
_IPV6_RE = re.compile(
    r"\b(?:[0-9A-Fa-f]{1,4}:){3,7}[0-9A-Fa-f]{1,4}\b"
    r"|(?:[0-9A-Fa-f]{1,4}:){1,6}:(?:[0-9A-Fa-f]{1,4}:){0,5}[0-9A-Fa-f]{0,4}"
    r"|::(?:[0-9A-Fa-f]{1,4}:){0,6}[0-9A-Fa-f]{1,4}"
)
_WINDOWS_PATH_RE = re.compile(
    r"[A-Za-z]:[\\/](?:[^\s\\/:*?\"<>|]+[\\/])*[^\s\\/:*?\"<>|]*"
)
# Un path absoluto de 1+ segmentos (p.ej. "/clip.mp4"), pero solo si el "/"
# no esta pegado a un caracter alfanumerico previo (evita redactar "and/or",
# "km/h", etc.).
_UNIX_PATH_RE = re.compile(r"(?<!\w)/[^\s/]+(?:/[^\s/]+)*/?")

# Orden: MAC/email/IP primero (patrones mas especificos) y paths al final,
# para que un path que contenga un email no deje residuos parcialmente
# redactados.
_PATTERNS = (
    _MAC_COLON_RE,
    _MAC_DASH_RE,
    _EMAIL_RE,
    _IPV4_RE,
    _IPV6_RE,
    _WINDOWS_PATH_RE,
    _UNIX_PATH_RE,
)


def redact(message: str) -> str:
    """Reemplaza paths absolutos, IPs (v4/v6), MACs y emails por
    ``<redacted>``."""
    redacted = message
    for pattern in _PATTERNS:
        redacted = pattern.sub(_REDACTED, redacted)
    return redacted
