// Generado por packages/design-tokens — no editar a mano (ADR-02).
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

  static const lightColors = _SsotColorScheme(
    background: Color(0xFFFFFFFF),
    foreground: Color(0xFF0F172A),
    muted: Color(0xFFF1F5F9),
    mutedForeground: Color(0xFF3F4A5C),
    primary: Color(0xFF1D4ED8),
    primaryForeground: Color(0xFFFFFFFF),
    destructive: Color(0xFFB91C1C),
    destructiveForeground: Color(0xFFFFFFFF),
    border: Color(0xFF64748B),
    ring: Color(0xFF1D4ED8),
  );

  static const darkColors = _SsotColorScheme(
    background: Color(0xFF0B1220),
    foreground: Color(0xFFE2E8F0),
    muted: Color(0xFF1E293B),
    mutedForeground: Color(0xFFA9B6C9),
    primary: Color(0xFF60A5FA),
    primaryForeground: Color(0xFF0B1220),
    destructive: Color(0xFFF87171),
    destructiveForeground: Color(0xFF1A0505),
    border: Color(0xFF64748B),
    ring: Color(0xFF60A5FA),
  );

  static const double spaceXs = 4;
  static const double spaceSm = 8;
  static const double spaceMd = 12;
  static const double spaceLg = 16;
  static const double spaceXl = 24;
  static const double spaceXxl = 32;

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
            fontSizeFactor: 1,
            bodyColor: colors.foreground,
            displayColor: colors.foreground,
          ),
    );
  }

  static ThemeData get light => _themeFrom(lightColors, Brightness.light);
  static ThemeData get dark => _themeFrom(darkColors, Brightness.dark);
}
