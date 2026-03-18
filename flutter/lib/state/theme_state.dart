import 'package:flutter/material.dart';

import 'package:emoji_spa/constants.dart';
import 'package:emoji_spa/services/storage_service.dart';

class ThemeState extends ChangeNotifier {
  final StorageService _storage;

  String _preference = themeSystem;

  ThemeState(this._storage);

  String get preference => _preference;

  ThemeMode get themeMode {
    switch (_preference) {
      case themeLight:
        return ThemeMode.light;
      case themeDark:
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  /// Load theme preference from storage.
  Future<void> initialize() async {
    _preference = await _storage.loadThemePreference();
    notifyListeners();
  }

  /// Set and persist the theme preference.
  Future<void> setPreference(String value) async {
    if (value != themeSystem && value != themeLight && value != themeDark) {
      value = themeSystem;
    }
    if (_preference == value) return;
    _preference = value;
    notifyListeners();
    await _storage.saveThemePreference(value);
  }
}
