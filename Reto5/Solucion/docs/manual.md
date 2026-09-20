# Manual de uso — Reto 5

## Setup

```bash
make setup            # uv sync + copia .env.example -> .env
```

## Desarrollo

```bash
make lint             # ruff + black --check + mypy
make format           # black + ruff --fix
make test             # pytest con cobertura (SQLite)
make test-fast        # pytest sin cobertura, iteración rápida
make ci               # lint + test + pip-audit + bandit
```

## Supabase local (opcional)

Requiere Docker y la Supabase CLI instalada.

```bash
make supabase-up      # supabase start
make test-supabase    # pytest -m supabase
make supabase-down    # supabase stop
```

## Ejecución

```bash
make run-cli           # python -m reto5 --help
make run-ui             # streamlit run src/reto5/interfaces/ui.py
```

Estado actual (Fase 0): entorno, configuración y fixtures listos; el
pipeline de ingesta/clasificación/nombramiento se implementa a partir de
Fase 1 (ver `.claude/CLAUDE.md`, sección 10).
