import { AnnouncerProvider } from "@ssot/a11y";
import { QueryClientProvider } from "@tanstack/react-query";
import type { JSX } from "react";
import { Navigate, Outlet, Route, BrowserRouter, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/auth-context.js";
import { RequireAuth } from "./auth/require-auth.js";
import { AppShell } from "./components/layout/app-shell.js";
import { createQueryClient } from "./lib/query-client.js";
import { ContactDetailPage } from "./routes/contact-detail-page.js";
import { ContactsListPage } from "./routes/contacts-list-page.js";
import { LoginPage } from "./routes/login-page.js";
import { NewContactPage } from "./routes/new-contact-page.js";
import { NotFoundPage } from "./routes/not-found-page.js";

const queryClient = createQueryClient();

export function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AnnouncerProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireAuth />}>
                <Route
                  element={
                    <AppShell>
                      <Outlet />
                    </AppShell>
                  }
                >
                  <Route path="/" element={<Navigate to="/contacts" replace />} />
                  <Route path="/contacts" element={<ContactsListPage />} />
                  <Route path="/contacts/new" element={<NewContactPage />} />
                  <Route path="/contacts/:id" element={<ContactDetailPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AnnouncerProvider>
    </QueryClientProvider>
  );
}
