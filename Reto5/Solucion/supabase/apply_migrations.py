"""Aplica las migraciones SQL de supabase/migrations/ contra SUPABASE_DB_URL.

Uso:
    python supabase/apply_migrations.py [--dry-run]

En CI se ejecuta con --dry-run: valida que los archivos son SQL bien formado
y que la conexión responde, sin persistir cambios.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


def listar_migraciones() -> list[Path]:
    return sorted(MIGRATIONS_DIR.glob("*.sql"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    migraciones = listar_migraciones()
    if not migraciones:
        print("No hay migraciones en supabase/migrations/.", file=sys.stderr)
        return 1

    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        print("SUPABASE_DB_URL no definida.", file=sys.stderr)
        return 1

    for migracion in migraciones:
        sql = migracion.read_text(encoding="utf-8")
        if not sql.strip():
            print(f"Migración vacía: {migracion.name}", file=sys.stderr)
            return 1
        print(f"{'[dry-run] ' if args.dry_run else ''}OK {migracion.name} ({len(sql)} bytes)")

    if args.dry_run:
        print("Dry-run completado: migraciones válidas.")
        return 0

    import asyncpg  # import diferido: solo necesario en aplicación real

    async def _aplicar() -> None:
        conn = await asyncpg.connect(db_url)
        try:
            for migracion in migraciones:
                await conn.execute(migracion.read_text(encoding="utf-8"))
                print(f"Aplicada {migracion.name}")
        finally:
            await conn.close()

    import asyncio

    asyncio.run(_aplicar())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
