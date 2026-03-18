import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show rootBundle;

import 'package:emoji_spa/constants.dart';
import 'package:emoji_spa/models/emoji_entry.dart';
import 'package:emoji_spa/models/usage_record.dart';
import 'package:emoji_spa/services/metadata_service.dart';
import 'package:emoji_spa/services/storage_service.dart';

class EmojiAppState extends ChangeNotifier {
  final StorageService _storage;

  // --- Core data ---
  Map<String, List<String>> allCategories = {};
  Map<String, EmojiEntry> metadataByEmoji = {};

  // --- Usage state ---
  final Map<String, UsageRecord> emojiUsage = {};
  final Set<String> pinnedEmojis = {};
  final Set<String> hiddenEmojis = {};

  // --- UI state ---
  String searchQuery = '';
  String selectedCategory = 'all';
  bool groupByCategory = true;
  bool showFrequentlyUsed = true;
  bool showRecentlyUsed = true;

  // --- Loading ---
  bool isLoading = true;

  // --- Throttled save ---
  Timer? _saveTimer;

  EmojiAppState(this._storage);

  /// Initialize all data: load categories, metadata, and usage from storage.
  Future<void> initialize() async {
    // Load categories, CLDR, Slack, and usage data concurrently.
    final results = await Future.wait([
      _loadCategories(),
      loadCldrMetadata(),
      loadSlackMetadata(),
      _storage.loadUsageData(),
    ]);

    allCategories = results[0] as Map<String, List<String>>;
    final cldrData = results[1] as Map<String, dynamic>;
    final slackData = results[2] as Map<String, dynamic>;
    final usageData = results[3] as UsageData;

    // Build and merge metadata.
    metadataByEmoji = buildBaseMetadata();
    mergeCldrMetadata(metadataByEmoji, cldrData);
    mergeSlackMetadata(metadataByEmoji, slackData);

    // Restore usage state.
    emojiUsage.addAll(usageData.items);
    pinnedEmojis.addAll(usageData.pinned);
    hiddenEmojis.addAll(usageData.hidden);
    groupByCategory = usageData.groupByCategory;
    showFrequentlyUsed = usageData.showFrequentlyUsed;
    showRecentlyUsed = usageData.showRecentlyUsed;

    isLoading = false;
    notifyListeners();
  }

  Future<Map<String, List<String>>> _loadCategories() async {
    final jsonString = await rootBundle.loadString('assets/emoji-categories.json');
    final data = json.decode(jsonString) as Map<String, dynamic>;
    return data.map((key, value) =>
        MapEntry(key, List<String>.from(value as List)));
  }

  // ---------------------------------------------------------------------------
  // Search & filtering
  // ---------------------------------------------------------------------------

  void setSearchQuery(String query) {
    if (searchQuery == query) return;
    searchQuery = query;
    notifyListeners();
  }

  void setSelectedCategory(String category) {
    if (selectedCategory == category) return;
    selectedCategory = category;
    notifyListeners();
  }

  void setGroupByCategory(bool value) {
    if (groupByCategory == value) return;
    groupByCategory = value;
    _scheduleSave();
    notifyListeners();
  }

  void setShowFrequentlyUsed(bool value) {
    if (showFrequentlyUsed == value) return;
    showFrequentlyUsed = value;
    _scheduleSave();
    notifyListeners();
  }

  void setShowRecentlyUsed(bool value) {
    if (showRecentlyUsed == value) return;
    showRecentlyUsed = value;
    _scheduleSave();
    notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Usage tracking
  // ---------------------------------------------------------------------------

  void recordUsage(String emoji) {
    if (emoji.isEmpty) return;
    final now = DateTime.now().millisecondsSinceEpoch;
    final current = emojiUsage[emoji] ?? UsageRecord();
    current.count += 1;
    current.lastUsed = now;
    emojiUsage[emoji] = current;
    _scheduleSave();
    notifyListeners();
  }

  void resetUsage(String emoji) {
    if (emoji.isEmpty) return;
    if (emojiUsage.remove(emoji) != null) {
      _scheduleSave();
      notifyListeners();
    }
  }

  void resetAllUsage() {
    if (emojiUsage.isEmpty && pinnedEmojis.isEmpty && hiddenEmojis.isEmpty) {
      return;
    }
    emojiUsage.clear();
    pinnedEmojis.clear();
    hiddenEmojis.clear();
    _scheduleSave();
    notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Pinned emoji management
  // ---------------------------------------------------------------------------

  void pinEmoji(String emoji) {
    if (emoji.isEmpty) return;
    pinnedEmojis.add(emoji);
    _scheduleSave();
    notifyListeners();
  }

  void unpinEmoji(String emoji) {
    if (emoji.isEmpty) return;
    if (pinnedEmojis.remove(emoji)) {
      _scheduleSave();
      notifyListeners();
    }
  }

  bool isPinned(String emoji) => pinnedEmojis.contains(emoji);

  // ---------------------------------------------------------------------------
  // Hidden emoji management
  // ---------------------------------------------------------------------------

  void hideEmoji(String emoji) {
    if (emoji.isEmpty) return;
    hiddenEmojis.add(emoji);
    _scheduleSave();
    notifyListeners();
  }

  void unhideEmoji(String emoji) {
    if (emoji.isEmpty) return;
    if (hiddenEmojis.remove(emoji)) {
      _scheduleSave();
      notifyListeners();
    }
  }

  bool isHidden(String emoji) => hiddenEmojis.contains(emoji);

  // ---------------------------------------------------------------------------
  // Computed lists: Frequently Used, Recently Used
  // ---------------------------------------------------------------------------

  /// Returns emojis sorted by count desc, then lastUsed desc.
  /// Only includes emojis with count >= frequentMinCount (if any qualify).
  List<String> getFrequentlyUsedEmojis() {
    if (emojiUsage.isEmpty) return [];

    final items = <_UsageItem>[];
    for (final entry in emojiUsage.entries) {
      if (entry.value.count <= 0) continue;
      items.add(_UsageItem(entry.key, entry.value.count, entry.value.lastUsed));
    }
    if (items.isEmpty) return [];

    items.sort((a, b) {
      if (b.count != a.count) return b.count.compareTo(a.count);
      return b.lastUsed.compareTo(a.lastUsed);
    });

    final strong = items.where((i) => i.count >= frequentMinCount).toList();
    final base = (strong.isNotEmpty ? strong : items).take(frequentLimit);
    return base.map((i) => i.emoji).toList();
  }

  /// Returns emojis sorted by lastUsed desc, excluding those in [excludeSet].
  List<String> getRecentlyUsedEmojis({Set<String>? excludeSet}) {
    if (emojiUsage.isEmpty) return [];

    final items = <_UsageItem>[];
    for (final entry in emojiUsage.entries) {
      if (entry.value.lastUsed <= 0) continue;
      if (excludeSet != null && excludeSet.contains(entry.key)) continue;
      items.add(_UsageItem(entry.key, entry.value.count, entry.value.lastUsed));
    }
    if (items.isEmpty) return [];

    items.sort((a, b) => b.lastUsed.compareTo(a.lastUsed));
    return items.take(recentLimit).map((i) => i.emoji).toList();
  }

  // ---------------------------------------------------------------------------
  // Filter pipeline
  // ---------------------------------------------------------------------------

  /// Tokenize search query.
  List<String> get searchTokens {
    final q = searchQuery.trim();
    if (q.isEmpty) return [];
    return q.split(RegExp(r'\s+')).where((t) => t.isNotEmpty).toList();
  }

  /// Check if an emoji matches all search tokens.
  bool emojiMatchesSearch(String emoji, String categoryName) {
    final tokens = searchTokens;
    if (tokens.isEmpty) return true;

    for (final token in tokens) {
      final lower = token.toLowerCase();
      var matched = false;

      // 1. Emoji character
      if (emoji.toLowerCase().contains(lower)) {
        matched = true;
      }

      // 2. Category name
      if (!matched && categoryName.toLowerCase().contains(lower)) {
        matched = true;
      }

      // 3. Category keywords
      if (!matched) {
        final catKw = categoryKeywords[categoryName];
        if (catKw != null) {
          for (final kw in catKw) {
            if (kw.toLowerCase().contains(lower)) {
              matched = true;
              break;
            }
          }
        }
      }

      // 4. Metadata name
      if (!matched) {
        final meta = metadataByEmoji[emoji];
        if (meta != null && meta.name.toLowerCase().contains(lower)) {
          matched = true;
        }
      }

      // 5. Metadata keywords
      if (!matched) {
        final meta = metadataByEmoji[emoji];
        if (meta != null) {
          for (final kw in meta.keywords) {
            if (kw.toLowerCase().contains(lower)) {
              matched = true;
              break;
            }
          }
        }
      }

      if (!matched) return false;
    }
    return true;
  }

  /// Get the list of filtered emojis for a given category.
  List<String> getFilteredEmojis(String categoryName, List<String> emojis) {
    return emojis
        .where((e) => !hiddenEmojis.contains(e))
        .where((e) => emojiMatchesSearch(e, categoryName))
        .toList();
  }

  /// Returns the category name for an emoji based on allCategories.
  String getCategoryForEmoji(String emoji) {
    for (final entry in allCategories.entries) {
      if (entry.value.contains(emoji)) return entry.key;
    }
    return 'Other Emoji';
  }

  /// Computes category dropdown options dynamically.
  List<String> get categoryOptions {
    final options = <String>['all'];

    if (pinnedEmojis.isNotEmpty) options.add('Pinned');

    if (showFrequentlyUsed) {
      final frequent = getFrequentlyUsedEmojis();
      if (frequent.isNotEmpty) options.add('Frequently Used');
    }

    if (showRecentlyUsed) {
      final frequentSet = showFrequentlyUsed
          ? getFrequentlyUsedEmojis().toSet()
          : <String>{};
      final recent = getRecentlyUsedEmojis(excludeSet: frequentSet);
      if (recent.isNotEmpty) options.add('Recently Used');
    }

    final sortedCategories = allCategories.keys.toList()..sort();
    options.addAll(sortedCategories);

    if (hiddenEmojis.isNotEmpty) options.add('Hidden');

    return options;
  }

  /// Check if a hidden emoji hint should be shown.
  /// Returns true when search matches only hidden emojis and no visible results.
  bool get shouldShowHiddenHint {
    if (hiddenEmojis.isEmpty || searchTokens.isEmpty) return false;

    // Check if there are any visible matches
    for (final entry in allCategories.entries) {
      for (final emoji in entry.value) {
        if (!hiddenEmojis.contains(emoji) &&
            emojiMatchesSearch(emoji, entry.key)) {
          return false; // Found a visible match
        }
      }
    }

    // Check if hidden emojis match
    for (final emoji in hiddenEmojis) {
      final cat = getCategoryForEmoji(emoji);
      if (emojiMatchesSearch(emoji, cat)) return true;
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Throttled persistence
  // ---------------------------------------------------------------------------

  void _scheduleSave() {
    if (_saveTimer != null) return; // Already scheduled, skip
    _saveTimer = Timer(const Duration(milliseconds: saveThrottleMs), () {
      _saveTimer = null;
      _persistNow();
    });
  }

  Future<void> _persistNow() async {
    await _storage.saveUsageData(
      items: emojiUsage,
      pinned: pinnedEmojis,
      hidden: hiddenEmojis,
      groupByCategory: groupByCategory,
      showFrequentlyUsed: showFrequentlyUsed,
      showRecentlyUsed: showRecentlyUsed,
    );
  }

  /// Force an immediate save (for testing or shutdown).
  Future<void> flushSave() async {
    _saveTimer?.cancel();
    _saveTimer = null;
    await _persistNow();
  }

  /// Cancel any pending save timer (for testing).
  void cancelPendingSave() {
    _saveTimer?.cancel();
    _saveTimer = null;
  }

  @override
  void dispose() {
    _saveTimer?.cancel();
    super.dispose();
  }
}

class _UsageItem {
  final String emoji;
  final int count;
  final int lastUsed;
  _UsageItem(this.emoji, this.count, this.lastUsed);
}
