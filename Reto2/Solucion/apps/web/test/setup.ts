import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { toHaveNoViolations } from "jest-axe";
import { afterAll, afterEach, beforeAll, expect } from "vitest";
import { server } from "./msw/server.js";

expect.extend(toHaveNoViolations);

// `test.globals` no está activado (evitamos globals implícitos): sin él,
// el auto-cleanup de Testing Library no se registra solo.
afterEach(() => cleanup());

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
