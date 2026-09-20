import { screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { ContactsListPage } from "../../src/routes/contacts-list-page.js";
import { contactFixture } from "../msw/handlers.js";
import { renderWithProviders } from "../test-utils.js";

describe("ContactsListPage (UC-11)", () => {
  it("muestra los contactos devueltos por la API y no tiene violaciones axe-core", async () => {
    const { container } = renderWithProviders(<ContactsListPage />);

    expect(screen.getByRole("heading", { name: "Contactos" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(contactFixture.displayName)).toBeInTheDocument());

    expect(await axe(container)).toHaveNoViolations();
  });

  it("el encabezado recibe el foco al montar (SPA sin recarga completa)", async () => {
    renderWithProviders(<ContactsListPage />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Contactos" })).toHaveFocus());
  });
});
