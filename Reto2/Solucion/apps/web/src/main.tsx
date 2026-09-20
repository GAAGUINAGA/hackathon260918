import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.js";
import { ConfigMissingPage } from "./config-missing-page.js";
import { loadWebEnv, MissingEnvError } from "./lib/env.js";
import "./index.css";

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("No se encontró #root en index.html.");
}

function rootView(): ReactNode {
  try {
    loadWebEnv();
    return <App />;
  } catch (error) {
    if (error instanceof MissingEnvError) {
      return <ConfigMissingPage missing={error.missing} />;
    }
    throw error;
  }
}

createRoot(rootElement).render(<StrictMode>{rootView()}</StrictMode>);
