import { colorTokens, spacingTokens, typographyTokens, type ColorTokens } from "./tokens.js";

function hexToDartColor(hex: string): string {
  const normalized = hex.replace("#", "").toUpperCase();
  return `Color(0xFF${normalized})`;
}

function colorSchemeOf(tokens: ColorTokens, brightness: "light" | "dark"): string {
  return `  static const ${brightness}Colors = _SsotColorScheme(
    background: ${hexToDartColor(tokens.background)},
    foreground: ${hexToDartColor(tokens.foreground)},
    muted: ${hexToDartColor(tokens.muted)},
    mutedForeground: ${hexToDartColor(tokens.mutedForeground)},
    primary: ${hexToDartColor(tokens.primary)},
    primaryForeground: ${hexToDartColor(tokens.primaryForeground)},
    destructive: ${hexToDartColor(tokens.destructive)},
    destructiveForeground: ${hexToDartColor(tokens.destructiveForeground)},
    border: ${hexToDartColor(tokens.border)},
    ring: ${hexToDartColor(tokens.ring)},
  );`;
}

/**
 * Proyecta los tokens a un archivo Dart con `ThemeData` claro/oscuro
 * (ADR-02, ADR-07). Se escribe directamente en `apps/mobile/lib/theme/`
 * porque Flutter no resuelve paquetes npm: el archivo generado es la
 * única forma de compartir la fuente de verdad con el cliente Dart.
 */
export function toDartTheme(): string {
  return `// Generado por packages/design-tokens — no editar a mano (ADR-02).
import "package:flutter/material.dart";

class _SsotColorScheme {
  const _SsotColorScheme({
    required this.background,
    required this.foreground,
    required this.muted,
    required this.mutedForeground,
    required this.primary,
    required this.primaryForeground,
    required this.destructive,
    required this.destructiveForeground,
    required this.border,
    required this.ring,
  });

  final Color background;
  final Color foreground;
  final Color muted;
  final Color mutedForeground;
  final Color primary;
  final Color primaryForeground;
  final Color destructive;
  final Color destructiveForeground;
  final Color border;
  final Color ring;
}

class SsotTheme {
  SsotTheme._();

${colorSchemeOf(colorTokens.light, "light")}

${colorSchemeOf(colorTokens.dark, "dark")}

  static const double spaceXs = ${spacingTokens.xs};
  static const double spaceSm = ${spacingTokens.sm};
  static const double spaceMd = ${spacingTokens.md};
  static const double spaceLg = ${spacingTokens.lg};
  static const double spaceXl = ${spacingTokens.xl};
  static const double spaceXxl = ${spacingTokens["2xl"]};

  static ThemeData _themeFrom(_SsotColorScheme colors, Brightness brightness) {
    return ThemeData(
      brightness: brightness,
      scaffoldBackgroundColor: colors.background,
      fontFamily: "Roboto",
      colorScheme: ColorScheme(
        brightness: brightness,
        primary: colors.primary,
        onPrimary: colors.primaryForeground,
        secondary: colors.muted,
        onSecondary: colors.mutedForeground,
        error: colors.destructive,
        onError: colors.destructiveForeground,
        surface: colors.background,
        onSurface: colors.foreground,
        outline: colors.border,
      ),
      // ADR-12 / WCAG 2.1 AA: el indicador de foco debe ser visible
      // (SC 2.4.7) con contraste no textual >= 3:1 (SC 1.4.11).
      focusColor: colors.ring,
      textTheme: Typography.material2021().black.apply(
            fontSizeFactor: ${typographyTokens.sizeBase / 16},
            bodyColor: colors.foreground,
            displayColor: colors.foreground,
          ),
    );
  }

  static ThemeData get light => _themeFrom(lightColors, Brightness.light);
  static ThemeData get dark => _themeFrom(darkColors, Brightness.dark);
}
`;
}
