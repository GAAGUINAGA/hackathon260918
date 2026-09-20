import { SetMetadata } from "@nestjs/common";

/**
 * UC-09 exige MFA TOTP activo (`aal2`) para vincular una integración; el
 * requisito se impone en la ruta, no en la interfaz (planeación §UC-09).
 * Ninguna ruta de esta fase lo usa todavía (UC-09 no tiene controlador
 * aún) — el guard ya sabe interpretarlo cuando llegue.
 */
export const REQUIRE_MFA_KEY = "ssot:requireMfa";
export const RequireMfa = () => SetMetadata(REQUIRE_MFA_KEY, true);
