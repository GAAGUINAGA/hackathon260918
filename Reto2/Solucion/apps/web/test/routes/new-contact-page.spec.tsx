import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ContactDetailPage } from "../../src/routes/contact-detail-page.js";
import { NewContactPage } from "../../src/routes/new-contact-page.js";
import { createdContactFixture } from "../msw/handlers.js";
import { renderWithProviders } from "../test-utils.js";

function renderNewContactRoute(): ReturnType<typeof renderWithProviders> {
  return renderWithProviders(
    <Routes>
      <Route path="/contacts/new" element={<NewContactPage />} />
      <Route path="/contacts/:id" element={<ContactDetailPage />} />
    </Routes>,
    { initialEntries: ["/contacts/new"] },
  );
}

describe("NewContactPage (UC-01)", () => {
  it("no tiene violaciones axe-core en el estado inicial", async () => {
    const { container } = renderNewContactRoute();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("crea el contacto y navega a su detalle", async () => {
    const user = userEvent.setup();
    renderNewContactRoute();

    await user.type(screen.getByLabelText("Nombre"), "Grace Hopper");
    await user.type(screen.getByLabelText("Correo electrónico"), "grace@example.com");
    await user.click(screen.getByRole("button", { name: "Crear contacto" }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: createdContactFixture.displayName })).toBeInTheDocument(),
    );
  });

  it("muestra el error del backend asociado al campo (RT-02)", async () => {
    const user = userEvent.setup();
    renderNewContactRoute();

    await user.type(screen.getByLabelText("Nombre"), "__invalid__");
    await user.click(screen.getByRole("button", { name: "Crear contacto" }));

    const fieldError = await screen.findByText("El nombre no puede estar vacío.");
    expect(fieldError).toHaveAttribute("role", "alert");
    expect(screen.getByLabelText("Nombre")).toHaveAttribute("aria-describedby", expect.stringContaining("error"));
  });
});
