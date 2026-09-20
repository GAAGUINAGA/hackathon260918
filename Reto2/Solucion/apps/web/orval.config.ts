import { defineConfig } from "orval";

/**
 * ADR-08 (contrato primero): genera hooks de TanStack Query tipados desde
 * `packages/contracts/openapi.json` (a su vez generado desde los
 * decoradores de `apps/api`, ver `apps/api/scripts/generate-openapi.tool.ts`).
 * `pnpm run generate:api-client` corre esto; `predev`/`pretest`/`prebuild`
 * lo disparan automáticamente para que el cliente nunca quede desfasado.
 */
export default defineConfig({
  ssot: {
    input: {
      target: "../../packages/contracts/openapi.json",
    },
    output: {
      mode: "tags-split",
      target: "src/api/generated/ssot.ts",
      schemas: "src/api/generated/models",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      override: {
        mutator: {
          path: "./src/api/fetch-client.ts",
          name: "ssotFetch",
        },
        // El mutador ya devuelve el cuerpo parseado (no el sobre
        // {data,status,headers} del cliente fetch de orval por defecto):
        // así las páginas leen `query.data.items` en vez de
        // `query.data.data.items`.
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
});
