# Politica de Seguridad — Motor Analitico Edge

## Alcance

Este documento aplica al codigo bajo `Reto4/Solucion/` (Motor Analitico
Edge, Reto 4). Ver `docs/threat-model.md` para el analisis STRIDE completo.

## Reporte de vulnerabilidades

Si detectas una vulnerabilidad de seguridad en este proyecto:

1. No abras un issue publico con detalles de explotacion.
2. Reporta el hallazgo directamente al mantenedor del repositorio
   (gabrielaguinaga30@gmail.com) con: descripcion, pasos de reproduccion,
   impacto estimado y version/commit afectado.
3. Recibiras confirmacion de recepcion en un plazo razonable; el hallazgo
   se clasifica por severidad y se corrige antes de divulgacion publica.

## Principios aplicados (P1 — Security-First)

- **Minimo privilegio**: el motor no abre puertos ni accede a red en Fase 1.
- **Defensa en profundidad**: validacion de YAML y video en 3 capas
  (Pydantic -> allowlist -> runtime checks).
- **Fail-secure**: ante un error de validacion, el motor aborta; nunca
  degrada silenciosamente.
- **Cadena de suministro verificada**: `requirements*.txt` con hashes
  (`pip-compile --generate-hashes`); `pip-audit` y `safety` en CI bloquean
  el merge ante vulnerabilidades de severidad >= High.
- **Analisis estatico**: `bandit -r src/` bloquea el merge ante hallazgos
  de severidad >= Medium.
- **Sin secretos en el repositorio**: `detect-secrets` corre en pre-commit
  y en CI sobre `.secrets.baseline`.

## Gates de seguridad activos en CI

Ver `.github/workflows/reto4-security.yml` (raiz del monorepo):
`bandit`, `pip-audit`, `safety check`, `detect-secrets scan`.

## Excepciones documentadas

| Vulnerabilidad | Paquete | Severidad | Justificacion | Estado |
|---|---|---|---|---|
| PYSEC-2026-3740 / GHSA-8mgp-746c-j5xp | `nltk` (dependencia transitiva de `safety`, herramienta de dev/CI) | High (CVSS 3.1: 7.0) | Path traversal en APIs de carga de modelos NLTK (`TransitionParser`, `AveragedPerceptron`, `PerceptronTagger`, `maxent`). Este proyecto no importa `nltk` en `src/` ni carga modelos NLTK desde ninguna ruta, confiable o no; el codigo vulnerable nunca se ejecuta. Sin version corregida disponible en PyPI al momento del escaneo (2026-09-19). | Ignorada explicitamente via `pip-audit --ignore-vuln PYSEC-2026-3740` en self-check y CI. Revisar en cada Fase; remover la excepcion cuando `nltk` publique un fix o `safety` deje de depender de `nltk`. |
