import { screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { ContactDetailPage } from "../../src/routes/contact-detail-page.js";
import { contactFixture } from "../msw/handlers.js";
import { renderWithProviders } from "../test-utils.js";

describe("ContactDetailPage (UC-12)", () => {
  it("muestra los datos del contacto y no tiene violaciones axe-core", async () => {
    const { container } = renderWithProviders(<ContactDetailPage />, {
      initialEntries: [`/contacts/${contactFixture.id}`],
      routePath: "/contacts/:id",
    });

    await waitFor(() => expect(screen.getByRole("heading", { name: contactFixture.displayName })).toBeInTheDocument());
    expect(screen.getByText(contactFixture.company)).toBeInTheDocument();
    expect(screen.getByText(contactFixture.primaryEmail)).toBeInTheDocument();

    expect(await axe(container)).toHaveNoViolations();
  });

  it("RT-15/UC-12: un id inexistente muestra 'no encontrado', nunca un 403 encubierto", async () => {
    renderWithProviders(<ContactDetailPage />, {
      initialEntries: ["/contacts/99999999-9999-9999-9999-999999999999"],
      routePath: "/contacts/:id",
    });

    await waitFor(() => expect(screen.getByRole("heading", { name: "Contacto no encontrado" })).toBeInTheDocument());
  });
});
