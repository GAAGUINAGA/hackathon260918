# ADR-002: Arquitectura por capas con puertos/adaptadores

## Contexto
El sistema debe poder evolucionar (SQLite → PostgreSQL/Supabase, filesystem local →
storage cloud) sin reescribir la lógica de negocio.

## Decisión
Arquitectura modular por capas (presentación, aplicación, dominio, infraestructura)
con puertos (`typing.Protocol`) e implementaciones intercambiables por adaptadores.

## Consecuencias
Portabilidad futura a web/multiusuario sin tocar `domain/` ni `application/`. Mayor
disciplina de diseño (los casos de uso solo dependen de puertos, nunca de
adaptadores concretos).
