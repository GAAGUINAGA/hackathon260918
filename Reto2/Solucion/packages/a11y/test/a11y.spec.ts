import { act, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { AnnouncerProvider, SkipLink, useAnnouncer, useRouteFocus, VisuallyHidden } from "../src/index.js";

describe("packages/a11y", () => {
  it("carga el paquete", async () => {
    const mod = await import("../src/index.js");
    expect(mod).toBeDefined();
  });

  it("VisuallyHidden no tiene violaciones axe-core y mantiene el texto accesible", async () => {
    const { container } = render(createElement(VisuallyHidden, null, "Solo para lectores de pantalla"));
    expect(screen.getByText("Solo para lectores de pantalla")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("SkipLink apunta al id del contenido principal y no tiene violaciones axe-core", async () => {
    const { container } = render(createElement(SkipLink, { targetId: "main-content" }));
    const link = screen.getByRole("link", { name: "Saltar al contenido principal" });
    expect(link).toHaveAttribute("href", "#main-content");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("AnnouncerProvider expone una región aria-live que recibe el mensaje anunciado", async () => {
    vi.useFakeTimers();
    function Consumer(): ReturnType<typeof createElement> {
      const { announce } = useAnnouncer();
      return createElement(
        "button",
        { onClick: () => announce("Contacto creado") },
        "anunciar",
      );
    }

    render(createElement(AnnouncerProvider, null, createElement(Consumer)));
    const button = screen.getByRole("button", { name: "anunciar" });
    act(() => button.click());
    act(() => vi.advanceTimersByTime(60));

    expect(screen.getByRole("status")).toHaveTextContent("Contacto creado");
    vi.useRealTimers();
  });

  it("useRouteFocus mueve el foco al encabezado cuando cambia la ruta", () => {
    function Screen({ routeKey }: { routeKey: string }): ReturnType<typeof createElement> {
      const headingRef = useRouteFocus(routeKey);
      return createElement("h1", { ref: headingRef, tabIndex: -1 }, "Contactos");
    }

    const { rerender } = render(createElement(Screen, { routeKey: "/contacts" }));
    rerender(createElement(Screen, { routeKey: "/contacts/123" }));

    expect(screen.getByRole("heading", { name: "Contactos" })).toHaveFocus();
  });
});
