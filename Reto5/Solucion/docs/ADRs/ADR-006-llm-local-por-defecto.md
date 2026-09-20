# ADR-006: LLM local por defecto (Ollama)

## Contexto
Enviar documentos potencialmente sensibles a un LLM remoto introduce riesgo de
privacidad y costo variable.

## Decisión
Ollama (llama3/mistral/qwen) como LLM por defecto para documentos sensibles; LLM
remoto (OpenAI/Anthropic/Gemini) solo opcional y con PII enmascarada (ver ADR-011
de seguridad, sección 13 de `.claude/CLAUDE.md`).

## Consecuencias
Privacidad por defecto y costo cero en el camino principal. Requiere Ollama
instalado para el modo local; en CI se mockea siempre (ADR-018).
