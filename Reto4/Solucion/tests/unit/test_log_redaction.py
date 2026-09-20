from __future__ import annotations

from src.security import log_redaction


def test_redact_replaces_email() -> None:
    redacted = log_redaction.redact("operador: ana.gomez@example.com")

    assert "ana.gomez@example.com" not in redacted
    assert "<redacted>" in redacted


def test_redact_replaces_mac_address() -> None:
    redacted = log_redaction.redact("interfaz 00:1A:2B:3C:4D:5E activa")

    assert "00:1A:2B:3C:4D:5E" not in redacted
    assert "<redacted>" in redacted


def test_redact_replaces_ipv4_address() -> None:
    redacted = log_redaction.redact("conexion desde 192.168.1.42")

    assert "192.168.1.42" not in redacted
    assert "<redacted>" in redacted


def test_redact_replaces_windows_absolute_path() -> None:
    redacted = log_redaction.redact(r"video en C:\Users\ana\Desktop\clip.mp4")

    assert "Users" not in redacted
    assert "<redacted>" in redacted


def test_redact_replaces_unix_absolute_path() -> None:
    redacted = log_redaction.redact("video en /home/ana/videos/clip.mp4")

    assert "/home/ana" not in redacted
    assert "<redacted>" in redacted


def test_redact_replaces_single_segment_unix_path() -> None:
    redacted = log_redaction.redact("guardado en /clip.mp4")

    assert "/clip.mp4" not in redacted
    assert "<redacted>" in redacted


def test_redact_does_not_touch_slash_inside_a_word() -> None:
    message = "velocidad 5 km/h, personas and/or vehiculos"

    assert log_redaction.redact(message) == message


def test_redact_replaces_mac_address_with_dashes() -> None:
    redacted = log_redaction.redact("interfaz 00-1A-2B-3C-4D-5E activa")

    assert "00-1A-2B-3C-4D-5E" not in redacted
    assert "<redacted>" in redacted


def test_redact_replaces_full_ipv6_address() -> None:
    redacted = log_redaction.redact("origen 2001:0db8:0000:0000:0000:0000:0000:0001")

    assert "2001:0db8" not in redacted
    assert "<redacted>" in redacted


def test_redact_replaces_compressed_ipv6_address() -> None:
    redacted = log_redaction.redact("origen fe80::1 conectado")

    assert "fe80::1" not in redacted
    assert "<redacted>" in redacted


def test_redact_does_not_treat_a_time_of_day_as_ipv6() -> None:
    message = "evento a las 14:23:05 UTC"

    assert log_redaction.redact(message) == message


def test_redact_leaves_non_pii_text_untouched() -> None:
    message = "DWELL_TRIGGER en zona_cafeteria, duracion 15.20s"

    assert log_redaction.redact(message) == message
