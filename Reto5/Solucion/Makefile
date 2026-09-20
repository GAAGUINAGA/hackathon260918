.PHONY: setup supabase-up supabase-down supabase-reset test test-supabase test-all test-fast lint format ci run-ui run-cli

setup:
	uv sync --all-extras
	cp -n .env.example .env || true

supabase-up:
	supabase start

supabase-down:
	supabase stop

supabase-reset:
	supabase db reset

test:
	RETO5_PERSISTENCE=sqlite uv run pytest --cov=src --cov-report=term-missing

test-supabase:
	uv run pytest -m supabase

test-all: test test-supabase

test-fast:
	RETO5_PERSISTENCE=sqlite uv run pytest -p no:cacheprovider --no-cov -q

lint:
	uv run ruff check src tests
	uv run black --check src tests
	uv run mypy src

format:
	uv run black src tests
	uv run ruff check --fix src tests

ci: lint test
	uv run pip-audit
	uv run bandit -r src

run-ui:
	uv run streamlit run src/reto5/interfaces/ui.py

run-cli:
	uv run python -m reto5 --help
