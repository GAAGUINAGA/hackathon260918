import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { toCssVariables } from "./css.js";
import { toDartTheme } from "./dart.js";

/**
 * Escribe los artefactos derivados de los tokens (ADR-02). Corre después
 * de `tsc` como parte de `build`, nunca en tiempo de importación de
 * `index.ts`, para que consumir el paquete no tenga efectos de archivo.
 */
function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(here, "../../..");

  const cssPath = resolve(here, "tokens.css");
  writeFileSync(cssPath, toCssVariables(), "utf-8");
  console.log(`tokens.css escrito en ${cssPath}`);

  const mobileLibDir = resolve(repoRoot, "apps/mobile/lib");
  if (existsSync(mobileLibDir)) {
    const themeDir = resolve(mobileLibDir, "theme");
    mkdirSync(themeDir, { recursive: true });
    const dartPath = resolve(themeDir, "ssot_theme.dart");
    writeFileSync(dartPath, toDartTheme(), "utf-8");
    console.log(`ssot_theme.dart escrito en ${dartPath}`);
  } else {
    console.log("apps/mobile/lib no existe todavía: ssot_theme.dart se generará cuando exista (Fase 5, Flutter).");
  }
}

main();
