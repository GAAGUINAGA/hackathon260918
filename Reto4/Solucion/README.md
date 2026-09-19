# Motor Analitico Edge — Reto 4

Motor de video edge (CPU-bound) que detecta y rastrea personas en una camara
de oficina, evalua su interaccion con zonas configurables y emite telemetria
estructurada.

Baseline: `.claude/planeacion_v1.2.0.md` (arquitectura) y `.claude/cdu_v1.0.0.md`
(casos de uso).

## Estado

Fase 0 — Bootstrap del repositorio, contratos y CI base.

## Instalacion (desarrollo)

```bash
cd Reto4/Solucion
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt -r requirements-dev.txt
```

## Self-check local

```bash
black --check src/ tests/ scripts/
flake8 src/ tests/ scripts/
ruff check src/ tests/ scripts/
mypy src/
pytest tests/ -v --cov=src --cov-report=term-missing
```
