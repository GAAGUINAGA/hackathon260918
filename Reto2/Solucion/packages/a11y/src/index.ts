/**
 * Primitivos de accesibilidad compartidos por la consola web React
 * (ADR-02, ADR-12: WCAG 2.1 AA como criterio de aceptación).
 */
export { VisuallyHidden } from "./visually-hidden.js";
export { SkipLink, type SkipLinkProps } from "./skip-link.js";
export { AnnouncerProvider, useAnnouncer, type AnnouncePriority, type AnnouncerContextValue } from "./live-region.js";
export { useRouteFocus } from "./use-route-focus.js";
