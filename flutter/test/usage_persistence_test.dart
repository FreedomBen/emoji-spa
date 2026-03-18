import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:emoji_spa/constants.dart';
import 'package:emoji_spa/models/emoji_entry.dart';
import 'package:emoji_spa/models/usage_record.dart';
import 'package:emoji_spa/services/storage_service.dart';
import 'package:emoji_spa/state/emoji_state.dart';
import 'package:emoji_spa/state/theme_state.dart';

void main() {
  group('UsageRecord', () {
    test('serializes to JSON', () {
      final record = UsageRecord(count: 5, lastUsed: 1000);
      final json = record.toJson();
      expect(json['count'], 5);
      expect(json['lastUsed'], 1000);
    });

    test('deserializes from JSON', () {
      final record = UsageRecord.fromJson({'count': 3, 'lastUsed': 2000});
      expect(record.count, 3);
      expect(record.lastUsed, 2000);
    });

    test('handles missing fields', () {
      final record = UsageRecord.fromJson({});
      expect(record.count, 0);
      expect(record.lastUsed, 0);
    });
  });

  group('StorageService', () {
    late StorageService storage;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      storage = StorageService();
    });

    test('loads empty usage data when nothing stored', () async {
      final data = await storage.loadUsageData();
      expect(data.items, isEmpty);
      expect(data.pinned, isEmpty);
      expect(data.hidden, isEmpty);
      expect(data.groupByCategory, equals(true));
      expect(data.showFrequentlyUsed, equals(true));
      expect(data.showRecentlyUsed, equals(true));
    });

    test('round-trips usage data', () async {
      final items = {
        '😀': UsageRecord(count: 5, lastUsed: 1000),
        '🔥': UsageRecord(count: 3, lastUsed: 2000),
      };

      await storage.saveUsageData(
        items: items,
        pinned: {'😀'},
        hidden: {'💩'},
        groupByCategory: false,
        showFrequentlyUsed: false,
        showRecentlyUsed: true,
      );

      final loaded = await storage.loadUsageData();
      expect(loaded.items.length, 2);
      expect(loaded.items['😀']!.count, 5);
      expect(loaded.items['😀']!.lastUsed, 1000);
      expect(loaded.items['🔥']!.count, 3);
      expect(loaded.pinned, ['😀']);
      expect(loaded.hidden, ['💩']);
      expect(loaded.groupByCategory, equals(false));
      expect(loaded.showFrequentlyUsed, equals(false));
      expect(loaded.showRecentlyUsed, equals(true));
    });

    test('handles corrupted storage gracefully', () async {
      SharedPreferences.setMockInitialValues({
        usageStorageKey: 'not valid json{{{',
      });
      storage = StorageService();
      final data = await storage.loadUsageData();
      expect(data.items, isEmpty);
    });

    test('round-trips theme preference', () async {
      await storage.saveThemePreference(themeDark);
      final pref = await storage.loadThemePreference();
      expect(pref, themeDark);
    });

    test('loads system as default theme', () async {
      final pref = await storage.loadThemePreference();
      expect(pref, themeSystem);
    });
  });

  group('EmojiAppState - usage tracking', () {
    late EmojiAppState state;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      state = EmojiAppState(StorageService());
    });

    tearDown(() {
      state.cancelPendingSave();
      state.dispose();
    });

    test('recordUsage increments count and sets lastUsed', () {
      state.recordUsage('😀');
      expect(state.emojiUsage['😀']!.count, 1);
      expect(state.emojiUsage['😀']!.lastUsed, greaterThan(0));

      state.recordUsage('😀');
      expect(state.emojiUsage['😀']!.count, 2);
    });

    test('recordUsage ignores empty string', () {
      state.recordUsage('');
      expect(state.emojiUsage, isEmpty);
    });

    test('resetUsage removes usage for a specific emoji', () {
      state.recordUsage('😀');
      state.recordUsage('🔥');
      state.resetUsage('😀');
      expect(state.emojiUsage.containsKey('😀'), equals(false));
      expect(state.emojiUsage.containsKey('🔥'), equals(true));
    });

    test('resetAllUsage clears everything', () {
      state.recordUsage('😀');
      state.pinEmoji('🔥');
      state.hideEmoji('💩');
      state.resetAllUsage();
      expect(state.emojiUsage, isEmpty);
      expect(state.pinnedEmojis, isEmpty);
      expect(state.hiddenEmojis, isEmpty);
    });
  });

  group('EmojiAppState - pinned emoji', () {
    late EmojiAppState state;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      state = EmojiAppState(StorageService());
    });

    tearDown(() {
      state.cancelPendingSave();
      state.dispose();
    });

    test('pinEmoji adds to pinned set', () {
      state.pinEmoji('😀');
      expect(state.isPinned('😀'), equals(true));
    });

    test('unpinEmoji removes from pinned set', () {
      state.pinEmoji('😀');
      state.unpinEmoji('😀');
      expect(state.isPinned('😀'), equals(false));
    });

    test('unpinEmoji is no-op for non-pinned emoji', () {
      state.unpinEmoji('😀');
      expect(state.pinnedEmojis, isEmpty);
    });

    test('pinEmoji ignores empty string', () {
      state.pinEmoji('');
      expect(state.pinnedEmojis, isEmpty);
    });
  });

  group('EmojiAppState - hidden emoji', () {
    late EmojiAppState state;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      state = EmojiAppState(StorageService());
    });

    tearDown(() {
      state.cancelPendingSave();
      state.dispose();
    });

    test('hideEmoji adds to hidden set', () {
      state.hideEmoji('💩');
      expect(state.isHidden('💩'), equals(true));
    });

    test('unhideEmoji removes from hidden set', () {
      state.hideEmoji('💩');
      state.unhideEmoji('💩');
      expect(state.isHidden('💩'), equals(false));
    });

    test('hideEmoji ignores empty string', () {
      state.hideEmoji('');
      expect(state.hiddenEmojis, isEmpty);
    });
  });

  group('EmojiAppState - frequently/recently used', () {
    late EmojiAppState state;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      state = EmojiAppState(StorageService());
    });

    tearDown(() {
      state.cancelPendingSave();
      state.dispose();
    });

    test('getFrequentlyUsedEmojis returns empty when no usage', () {
      expect(state.getFrequentlyUsedEmojis(), isEmpty);
    });

    test('getFrequentlyUsedEmojis prefers emojis with count >= threshold', () {
      // Add emojis with varying counts
      state.emojiUsage['😀'] = UsageRecord(count: 5, lastUsed: 100);
      state.emojiUsage['🔥'] = UsageRecord(count: 1, lastUsed: 200);
      state.emojiUsage['💧'] = UsageRecord(count: 3, lastUsed: 150);

      final frequent = state.getFrequentlyUsedEmojis();
      // Only 😀 (5) and 💧 (3) meet the threshold of 2
      expect(frequent, contains('😀'));
      expect(frequent, contains('💧'));
      expect(frequent, isNot(contains('🔥')));
    });

    test('getFrequentlyUsedEmojis falls back to all when none meet threshold', () {
      state.emojiUsage['😀'] = UsageRecord(count: 1, lastUsed: 100);
      state.emojiUsage['🔥'] = UsageRecord(count: 1, lastUsed: 200);

      final frequent = state.getFrequentlyUsedEmojis();
      expect(frequent.length, 2);
    });

    test('getFrequentlyUsedEmojis sorted by count desc then lastUsed desc', () {
      state.emojiUsage['😀'] = UsageRecord(count: 3, lastUsed: 100);
      state.emojiUsage['🔥'] = UsageRecord(count: 5, lastUsed: 200);
      state.emojiUsage['💧'] = UsageRecord(count: 3, lastUsed: 300);

      final frequent = state.getFrequentlyUsedEmojis();
      expect(frequent[0], '🔥'); // highest count
      expect(frequent[1], '💧'); // same count as 😀 but more recent
      expect(frequent[2], '😀');
    });

    test('getRecentlyUsedEmojis sorted by lastUsed desc', () {
      state.emojiUsage['😀'] = UsageRecord(count: 1, lastUsed: 100);
      state.emojiUsage['🔥'] = UsageRecord(count: 1, lastUsed: 300);
      state.emojiUsage['💧'] = UsageRecord(count: 1, lastUsed: 200);

      final recent = state.getRecentlyUsedEmojis();
      expect(recent[0], '🔥');
      expect(recent[1], '💧');
      expect(recent[2], '😀');
    });

    test('getRecentlyUsedEmojis excludes specified set', () {
      state.emojiUsage['😀'] = UsageRecord(count: 1, lastUsed: 100);
      state.emojiUsage['🔥'] = UsageRecord(count: 1, lastUsed: 200);

      final recent = state.getRecentlyUsedEmojis(excludeSet: {'🔥'});
      expect(recent, ['😀']);
    });

    test('getRecentlyUsedEmojis respects limit', () {
      // Add more than recentLimit emojis
      for (var i = 0; i < 60; i++) {
        final emoji = String.fromCharCode(0x1F600 + i);
        state.emojiUsage[emoji] = UsageRecord(count: 1, lastUsed: i);
      }

      final recent = state.getRecentlyUsedEmojis();
      expect(recent.length, recentLimit);
    });
  });

  group('EmojiAppState - throttled persistence', () {
    late EmojiAppState state;
    late StorageService storage;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      storage = StorageService();
      state = EmojiAppState(storage);
    });

    tearDown(() {
      state.cancelPendingSave();
      state.dispose();
    });

    test('flushSave persists current state immediately', () async {
      state.recordUsage('😀');
      state.pinEmoji('🔥');

      await state.flushSave();

      final loaded = await storage.loadUsageData();
      expect(loaded.items['😀']!.count, 1);
      expect(loaded.pinned, contains('🔥'));
    });

    test('state changes are captured at save time, not mutation time', () async {
      state.recordUsage('😀');
      // More mutations before save fires
      state.recordUsage('😀');
      state.recordUsage('🔥');

      await state.flushSave();

      final loaded = await storage.loadUsageData();
      expect(loaded.items['😀']!.count, 2);
      expect(loaded.items['🔥']!.count, 1);
    });
  });

  group('ThemeState', () {
    late ThemeState themeState;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      themeState = ThemeState(StorageService());
    });

    test('defaults to system theme', () {
      expect(themeState.preference, themeSystem);
    });

    test('setPreference updates and persists', () async {
      await themeState.setPreference(themeDark);
      expect(themeState.preference, themeDark);

      // Verify persisted
      final storage = StorageService();
      final pref = await storage.loadThemePreference();
      expect(pref, themeDark);
    });

    test('setPreference normalizes invalid values to system', () async {
      await themeState.setPreference('invalid');
      expect(themeState.preference, themeSystem);
    });

    test('themeMode maps correctly', () async {
      expect(themeState.themeMode, ThemeMode.system);

      await themeState.setPreference(themeLight);
      expect(themeState.themeMode, ThemeMode.light);

      await themeState.setPreference(themeDark);
      expect(themeState.themeMode, ThemeMode.dark);
    });
  });

  group('EmojiAppState - search and filtering', () {
    late EmojiAppState state;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      state = EmojiAppState(StorageService());
      // Set up test categories
      state.allCategories = {
        'Smileys & Emotion': ['😀', '😁', '😂'],
        'Animals & Nature': ['🐶', '🐱'],
      };
    });

    tearDown(() {
      state.cancelPendingSave();
      state.dispose();
    });

    test('getFilteredEmojis excludes hidden emojis', () {
      state.hideEmoji('😁');
      final filtered = state.getFilteredEmojis(
        'Smileys & Emotion',
        ['😀', '😁', '😂'],
      );
      expect(filtered, ['😀', '😂']);
    });

    test('getFilteredEmojis applies search filter', () {
      state.metadataByEmoji = {
        '😀': const EmojiEntry(emoji: '😀', name: 'grinning face', keywords: ['smile']),
        '😁': const EmojiEntry(emoji: '😁', name: 'beaming face', keywords: ['grin']),
        '😂': const EmojiEntry(emoji: '😂', name: 'tears of joy', keywords: ['laugh']),
      };
      state.setSearchQuery('grin');
      final filtered = state.getFilteredEmojis(
        'Smileys & Emotion',
        ['😀', '😁', '😂'],
      );
      // 😀 matches 'grinning', 😁 matches 'grin'
      expect(filtered, contains('😀'));
      expect(filtered, contains('😁'));
      expect(filtered, isNot(contains('😂')));
    });

    test('categoryOptions includes special sections when applicable', () {
      state.pinEmoji('😀');
      state.emojiUsage['😀'] = UsageRecord(count: 5, lastUsed: 1000);
      // Add a second emoji that only qualifies for recently used (not frequent)
      state.emojiUsage['🐶'] = UsageRecord(count: 1, lastUsed: 500);
      state.hideEmoji('😂');

      final options = state.categoryOptions;
      expect(options.first, 'all');
      expect(options, contains('Pinned'));
      expect(options, contains('Frequently Used'));
      expect(options, contains('Recently Used'));
      expect(options.last, 'Hidden');
    });

    test('categoryOptions omits special sections when empty', () {
      final options = state.categoryOptions;
      expect(options, isNot(contains('Pinned')));
      expect(options, isNot(contains('Hidden')));
    });
  });
}
