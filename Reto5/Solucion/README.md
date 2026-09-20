# Reto 5 — Document Organizer AI

Clasificación, organización y nombramiento automatizado de documentos.
Local-first, monousuario, arquitectura por capas con puertos/adaptadores,
portable a cloud (Supabase local-first) sin reescribir el core.

Gobernanza, stack, fases y reglas duras del proyecto: ver `.claude/CLAUDE.md`.

## Quickstart

```bash
make setup
make test
```

## Estado

**Fase 0 — Setteo del entorno** (ver `.claude/CLAUDE.md`, sección 10).

## Documentos base

`docs/planeacion_v2.0.1.md` y `docs/CDU_v1.0.1.md` — diseño completo (arquitectura,
taxonomía, convención de nombres, concurrencia, atomicidad cross-partition,
gestión de contexto LLM, 12 casos de uso). `config/taxonomia.yaml` y
`config/convencion.yaml` implementan literalmente lo definido ahí. Ver
`docs/ADRs/` para las 19 decisiones registradas.
