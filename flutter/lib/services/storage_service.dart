import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'package:emoji_spa/constants.dart';
import 'package:emoji_spa/models/usage_record.dart';

/// Persisted usage data shape:
/// {
///   "version": 1,
///   "items": { "😀": { "count": 5, "lastUsed": 1234567890 }, ... },
///   "pinned": ["😀", "🔥"],
///   "hidden": ["💩"],
///   "groupByCategory": true,
///   "showFrequentlyUsed": true,
///   "showRecentlyUsed": true
/// }
class UsageData {
  final Map<String, UsageRecord> items;
  final List<String> pinned;
  final List<String> hidden;
  final bool groupByCategory;
  final bool showFrequentlyUsed;
  final bool showRecentlyUsed;

  const UsageData({
    this.items = const {},
    this.pinned = const [],
    this.hidden = const [],
    this.groupByCategory = true,
    this.showFrequentlyUsed = true,
    this.showRecentlyUsed = true,
  });
}

class StorageService {
  SharedPreferences? _prefs;

  Future<SharedPreferences> get _preferences async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  /// Loads usage data from storage.
  Future<UsageData> loadUsageData() async {
    final prefs = await _preferences;
    final raw = prefs.getString(usageStorageKey);
    if (raw == null) return const UsageData();

    try {
      final data = json.decode(raw) as Map<String, dynamic>;

      final itemsRaw = data['items'] as Map<String, dynamic>? ?? {};
      final items = <String, UsageRecord>{};
      for (final entry in itemsRaw.entries) {
        if (entry.value is Map<String, dynamic>) {
          items[entry.key] = UsageRecord.fromJson(entry.value as Map<String, dynamic>);
        }
      }

      return UsageData(
        items: items,
        pinned: List<String>.from(data['pinned'] as List? ?? []),
        hidden: List<String>.from(data['hidden'] as List? ?? []),
        groupByCategory: data['groupByCategory'] as bool? ?? true,
        showFrequentlyUsed: data['showFrequentlyUsed'] as bool? ?? true,
        showRecentlyUsed: data['showRecentlyUsed'] as bool? ?? true,
      );
    } catch (_) {
      return const UsageData();
    }
  }

  /// Saves usage data to storage.
  Future<void> saveUsageData({
    required Map<String, UsageRecord> items,
    required Set<String> pinned,
    required Set<String> hidden,
    required bool groupByCategory,
    required bool showFrequentlyUsed,
    required bool showRecentlyUsed,
  }) async {
    final prefs = await _preferences;
    final data = {
      'version': 1,
      'items': items.map((k, v) => MapEntry(k, v.toJson())),
      'pinned': pinned.toList(),
      'hidden': hidden.toList(),
      'groupByCategory': groupByCategory,
      'showFrequentlyUsed': showFrequentlyUsed,
      'showRecentlyUsed': showRecentlyUsed,
    };
    await prefs.setString(usageStorageKey, json.encode(data));
  }

  /// Loads the theme preference string from storage.
  Future<String> loadThemePreference() async {
    final prefs = await _preferences;
    return prefs.getString(themeStorageKey) ?? themeSystem;
  }

  /// Saves the theme preference string to storage.
  Future<void> saveThemePreference(String preference) async {
    final prefs = await _preferences;
    await prefs.setString(themeStorageKey, preference);
  }
}
