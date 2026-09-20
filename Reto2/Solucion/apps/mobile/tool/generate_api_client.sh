#!/usr/bin/env bash
# ADR-08 (contrato primero): regenera packages/ssot_api_client desde
# packages/contracts/openapi.json (a su vez generado por
# apps/api/scripts/generate-openapi.tool.ts). Requiere Java (para el jar
# de openapi-generator, descargado y cacheado por npx la primera vez).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

rm -rf packages/ssot_api_client

npx --yes @openapitools/openapi-generator-cli@2.41.0 generate \
  -i ../../packages/contracts/openapi.json \
  -g dart-dio \
  -o packages/ssot_api_client \
  --additional-properties=pubName=ssot_api_client,pubAuthor=SSOT,nullableFields=true

(cd packages/ssot_api_client && flutter pub get && dart run build_runner build)

echo "packages/ssot_api_client regenerado."
