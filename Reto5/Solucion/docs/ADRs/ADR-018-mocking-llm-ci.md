# ADR-018: Mocking obligatorio de LLMPort en CI

## Contexto
GitHub Actions no tiene GPU; Ollama es lento y no determinista. El LLM remoto
introduce costo, latencia y dependencia de red.

## Decisión
Usar `FakeLLM` (in-memory) por defecto y VCR.py con cassettes para integración.
LLM real solo opt-in con marcadores `llm_local` / `llm_remote`.

## Consecuencias
CI rápido (< 5 min), determinista, sin costos. Las cassettes deben regenerarse
cuando cambie el prompt.
