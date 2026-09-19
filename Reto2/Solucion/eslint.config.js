// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/node_modules/**",
      "apps/mobile/**",
      "*.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // ADR-09 se verifica mecanicamente con dependency-cruiser, no aqui.
      // Estas reglas evitan que se "haga trampa" al linter (ver prompt OpenCode §1).
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSNonNullExpression",
          message:
            "Evitar el operador de asercion no-nula (!); usar Result<T,E> o narrowing explicito.",
        },
      ],
    },
  },
  {
    files: ["packages/domain/**/*.ts"],
    rules: {
      // ADR-10: en el dominio no existen string/number desnudos representando
      // datos externos; la regla estructural (VOs con fabricas) se audita,
      // esto solo evita el escape mas comun.
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
);
