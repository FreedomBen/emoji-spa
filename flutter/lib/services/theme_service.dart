import 'package:emoji_spa/constants.dart';
import 'package:emoji_spa/services/storage_service.dart';

class ThemeService {
  final StorageService _storage;

  ThemeService(this._storage);

  /// Loads the stored theme preference.
  Future<String> loadPreference() => _storage.loadThemePreference();

  /// Saves the theme preference.
  Future<void> savePreference(String preference) {
    if (preference != themeSystem &&
        preference != themeLight &&
        preference != themeDark) {
      preference = themeSystem;
    }
    return _storage.saveThemePreference(preference);
  }
}
