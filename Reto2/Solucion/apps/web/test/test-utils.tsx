import { AnnouncerProvider } from "@ssot/a11y";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { PropsWithChildren, ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../src/auth/auth-context.js";

export interface RenderWithProvidersOptions {
  readonly initialEntries?: string[];
  /** Cuando la pantalla lee `useParams()` (p. ej. `/contacts/:id`). */
  readonly routePath?: string;
}

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}): RenderResult {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  function Wrapper({ children }: PropsWithChildren): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <AnnouncerProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={options.initialEntries ?? ["/"]}>{children}</MemoryRouter>
          </AuthProvider>
        </AnnouncerProvider>
      </QueryClientProvider>
    );
  }

  const content =
    options.routePath !== undefined ? (
      <Routes>
        <Route path={options.routePath} element={ui} />
      </Routes>
    ) : (
      ui
    );

  return render(content, { wrapper: Wrapper });
}
