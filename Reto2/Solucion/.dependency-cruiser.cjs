/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-is-pure",
      comment:
        "packages/domain (Anillo 0) no puede depender de ningun otro anillo ni de infraestructura externa (ADR-09).",
      severity: "error",
      from: { path: "^packages/domain/src" },
      to: {
        path: [
          "^apps/",
          "^packages/application",
          "^packages/infrastructure",
          "^packages/contracts",
          "^packages/design-tokens",
          "^packages/a11y",
        ],
      },
    },
    {
      name: "domain-no-external-deps",
      comment:
        "packages/domain/src no puede importar dependencias externas de node_modules, salvo la lista blanca explicita (ADR-09, ADR-10). Herramientas de prueba (vitest) quedan fuera de este anillo, en packages/domain/test.",
      severity: "error",
      from: { path: "^packages/domain/src" },
      to: {
        path: "node_modules",
        pathNot: "node_modules/(\\.pnpm/)?neverthrow",
      },
    },
    {
      name: "domain-no-node-core",
      comment:
        "packages/domain/src no puede importar modulos nativos de Node (fs, http, crypto, ...): son infraestructura, no dominio puro (ADR-09).",
      severity: "error",
      from: { path: "^packages/domain/src" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "application-no-external-deps",
      comment:
        "packages/application/src no puede importar dependencias externas de node_modules, salvo la lista blanca explicita (neverthrow) y el propio @ssot/domain (ADR-09).",
      severity: "error",
      from: { path: "^packages/application/src" },
      to: {
        path: "node_modules",
        pathNot: "node_modules/(\\.pnpm/)?neverthrow",
      },
    },
    {
      name: "application-no-node-core",
      comment:
        "packages/application/src no puede importar modulos nativos de Node: la orquestacion de casos de uso no invoca infraestructura real (ADR-09).",
      severity: "error",
      from: { path: "^packages/application/src" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "no-llm-in-domain",
      comment:
        "packages/domain no puede importar librerias de IA/LLM bajo ningun alias (ADR-20: la IA es aditiva y diferida a F7).",
      severity: "error",
      from: { path: "^packages/domain" },
      to: {
        path: [
          "openai",
          "@anthropic-ai",
          "anthropic",
          "langchain",
          "llamaindex",
          "@google/generative-ai",
          "cohere-ai",
          "ollama",
          "transformers",
          "@xenova",
          "pgvector",
        ],
      },
    },
    {
      name: "application-no-infra",
      comment:
        "packages/application (Anillo 1) no puede depender de infraestructura real ni de las apps (ADR-09).",
      severity: "error",
      from: { path: "^packages/application" },
      to: { path: ["^apps/", "^packages/infrastructure"] },
    },
    {
      name: "no-inward-leak",
      comment:
        "Regla de dependencia general: ningun anillo interior puede depender de un anillo exterior (ADR-09). infrastructure no puede depender de las apps.",
      severity: "error",
      from: { path: "^packages/infrastructure" },
      to: { path: "^apps/" },
    },
    {
      name: "no-cross-ring-types-api",
      comment:
        "Las apps no se importan entre si directamente; comparten tipos solo via packages/contracts (ADR-08).",
      severity: "error",
      from: { path: "^apps/api" },
      to: { path: "^apps/(worker|web)" },
    },
    {
      name: "no-cross-ring-types-worker",
      comment:
        "Las apps no se importan entre si directamente; comparten tipos solo via packages/contracts (ADR-08).",
      severity: "error",
      from: { path: "^apps/worker" },
      to: { path: "^apps/(api|web)" },
    },
    {
      name: "no-cross-ring-types-web",
      comment:
        "Las apps no se importan entre si directamente; comparten tipos solo via packages/contracts (ADR-08).",
      severity: "error",
      from: { path: "^apps/web" },
      to: { path: "^apps/(api|worker)" },
    },
    {
      name: "no-llm-in-application",
      comment:
        "packages/application solo declara LlmPort/EmbeddingPort como interfaces; no importa un SDK de proveedor de IA (ADR-20).",
      severity: "error",
      from: { path: "^packages/application" },
      to: {
        path: [
          "openai",
          "@anthropic-ai",
          "anthropic",
          "langchain",
          "llamaindex",
          "@google/generative-ai",
          "cohere-ai",
          "ollama",
        ],
      },
    },
    {
      name: "no-circular",
      comment: "Ninguna dependencia circular entre modulos.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.base.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
