import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { LoginPage } from "../../src/routes/login-page.js";
import { renderWithProviders } from "../test-utils.js";

describe("LoginPage (UC-08)", () => {
  it("no tiene violaciones axe-core", async () => {
    const { container } = renderWithProviders(<LoginPage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("anuncia el error de credenciales inválidas de forma asertiva", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/Correo electrónico/), "user@example.com");
    await user.type(screen.getByLabelText(/Contraseña/), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    const fieldError = await screen.findByText("Invalid login credentials");
    expect(fieldError).toHaveAttribute("role", "alert");
  });
});
