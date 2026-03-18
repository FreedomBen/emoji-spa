import 'package:flutter/material.dart';

// Dark theme colors (default) — from CSS custom properties
class DarkColors {
  static const bg = Color(0xFF0F172A);
  static const fg = Color(0xFFE5E7EB);
  static const headerBg = Color(0xFF020617);
  static const border = Color(0xFF1F2937);
  static const borderSubtle = Color(0xFF111827);
  static const muted = Color(0xFF9CA3AF);
  static const toggleLabel = Color(0xFFD1D5DB);
  static const inputBg = Color(0xFF020617);
  static const inputBorderHover = Color(0xFF374151);
  static const emojiBg = Color(0xFF020617);
  static const emojiHoverBg = Color(0xFF111827);
  static const emojiActiveBg = Color(0xFF0F172A);
  static const contextBg = Color(0xFF020617);
  static const contextHoverBg = Color(0xFF111827);
  static const accent = Color(0xFF38BDF8);
}

// Light theme colors — from CSS body[data-theme="light"]
class LightColors {
  static const bg = Color(0xFFF9FAFB);
  static const fg = Color(0xFF111827);
  static const headerBg = Color(0xFFFFFFFF);
  static const border = Color(0xFFD1D5DB);
  static const borderSubtle = Color(0xFFE5E7EB);
  static const muted = Color(0xFF6B7280);
  static const toggleLabel = Color(0xFF374151);
  static const inputBg = Color(0xFFFFFFFF);
  static const inputBorderHover = Color(0xFF9CA3AF);
  static const emojiBg = Color(0xFFFFFFFF);
  static const emojiHoverBg = Color(0xFFE5E7EB);
  static const emojiActiveBg = Color(0xFFE5E7EB);
  static const contextBg = Color(0xFFFFFFFF);
  static const contextHoverBg = Color(0xFFF3F4F6);
  static const accent = Color(0xFF0EA5E9);
}

ThemeData buildLightTheme() {
  return ThemeData(
    brightness: Brightness.light,
    scaffoldBackgroundColor: LightColors.bg,
    colorScheme: const ColorScheme.light(
      surface: LightColors.bg,
      primary: LightColors.accent,
      onSurface: LightColors.fg,
      outline: LightColors.border,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: LightColors.headerBg,
      foregroundColor: LightColors.fg,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: LightColors.inputBg,
      hintStyle: const TextStyle(color: LightColors.muted),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(6),
        borderSide: const BorderSide(color: LightColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(6),
        borderSide: const BorderSide(color: LightColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(6),
        borderSide: const BorderSide(color: LightColors.accent, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    ),
    dropdownMenuTheme: DropdownMenuThemeData(
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: LightColors.inputBg,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: const BorderSide(color: LightColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: const BorderSide(color: LightColors.border),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
    ),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) return LightColors.accent;
        return LightColors.inputBg;
      }),
    ),
    textTheme: const TextTheme(
      bodyMedium: TextStyle(color: LightColors.fg),
      bodySmall: TextStyle(color: LightColors.muted),
      titleMedium: TextStyle(color: LightColors.fg),
      labelMedium: TextStyle(color: LightColors.toggleLabel),
    ),
    dividerColor: LightColors.border,
    fontFamily: 'system-ui',
  );
}

ThemeData buildDarkTheme() {
  return ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: DarkColors.bg,
    colorScheme: const ColorScheme.dark(
      surface: DarkColors.bg,
      primary: DarkColors.accent,
      onSurface: DarkColors.fg,
      outline: DarkColors.border,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: DarkColors.headerBg,
      foregroundColor: DarkColors.fg,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: DarkColors.inputBg,
      hintStyle: const TextStyle(color: DarkColors.muted),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(6),
        borderSide: const BorderSide(color: DarkColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(6),
        borderSide: const BorderSide(color: DarkColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(6),
        borderSide: const BorderSide(color: DarkColors.accent, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    ),
    dropdownMenuTheme: DropdownMenuThemeData(
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: DarkColors.inputBg,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: const BorderSide(color: DarkColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: const BorderSide(color: DarkColors.border),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
    ),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) return DarkColors.accent;
        return DarkColors.inputBg;
      }),
    ),
    textTheme: const TextTheme(
      bodyMedium: TextStyle(color: DarkColors.fg),
      bodySmall: TextStyle(color: DarkColors.muted),
      titleMedium: TextStyle(color: DarkColors.fg),
      labelMedium: TextStyle(color: DarkColors.toggleLabel),
    ),
    dividerColor: DarkColors.border,
    fontFamily: 'system-ui',
  );
}
