import 'package:flutter_test/flutter_test.dart';
import 'package:emoji_spa/models/emoji_entry.dart';
import 'package:emoji_spa/services/metadata_service.dart';

void main() {
  group('buildBaseMetadata', () {
    test('returns non-empty map', () {
      final metadata = buildBaseMetadata();
      expect(metadata.isNotEmpty, isTrue);
    });

    test('contains known emoji entries', () {
      final metadata = buildBaseMetadata();
      expect(metadata.containsKey('😀'), isTrue);
      expect(metadata['😀']!.name, 'grinning face');
      expect(metadata['😀']!.keywords, contains('smile'));
    });

    test('entries have emoji, name, and keywords', () {
      final metadata = buildBaseMetadata();
      for (final entry in metadata.values) {
        expect(entry.emoji.isNotEmpty, isTrue);
        expect(entry.name.isNotEmpty, isTrue);
        expect(entry.keywords, isA<List<String>>());
      }
    });
  });

  group('mergeCldrMetadata', () {
    test('adds new emoji entries from CLDR', () {
      final metadata = <String, EmojiEntry>{};
      final cldr = {
        '🎃': {
          'name': 'jack-o-lantern',
          'keywords': ['halloween', 'pumpkin'],
        },
      };

      mergeCldrMetadata(metadata, cldr);
      expect(metadata.containsKey('🎃'), isTrue);
      expect(metadata['🎃']!.name, 'jack-o-lantern');
      expect(metadata['🎃']!.keywords, containsAll(['halloween', 'pumpkin']));
    });

    test('does not override existing name', () {
      final metadata = <String, EmojiEntry>{
        '😀': const EmojiEntry(
          emoji: '😀',
          name: 'grinning face',
          keywords: ['smile'],
        ),
      };
      final cldr = {
        '😀': {
          'name': 'cldr grinning',
          'keywords': ['happy'],
        },
      };

      mergeCldrMetadata(metadata, cldr);
      // Original name should be preserved
      expect(metadata['😀']!.name, 'grinning face');
    });

    test('overrides name when base name is empty', () {
      final metadata = <String, EmojiEntry>{
        '😀': const EmojiEntry(emoji: '😀', name: '', keywords: ['smile']),
      };
      final cldr = {
        '😀': {
          'name': 'cldr grinning',
          'keywords': ['happy'],
        },
      };

      mergeCldrMetadata(metadata, cldr);
      expect(metadata['😀']!.name, 'cldr grinning');
    });

    test('unions keywords without duplicates', () {
      final metadata = <String, EmojiEntry>{
        '😀': const EmojiEntry(
          emoji: '😀',
          name: 'grinning face',
          keywords: ['smile', 'happy'],
        ),
      };
      final cldr = {
        '😀': {
          'name': 'grinning',
          'keywords': ['happy', 'joy', 'face'],
        },
      };

      mergeCldrMetadata(metadata, cldr);
      final keywords = metadata['😀']!.keywords;
      expect(keywords, containsAll(['smile', 'happy', 'joy', 'face']));
      // Check no duplicates
      expect(keywords.toSet().length, keywords.length);
    });

    test('skips non-map values in CLDR data', () {
      final metadata = <String, EmojiEntry>{};
      final cldr = <String, dynamic>{
        '😀': 'not a map',
      };

      mergeCldrMetadata(metadata, cldr);
      expect(metadata.isEmpty, isTrue);
    });
  });

  group('mergeSlackMetadata', () {
    test('adds slack keywords to existing entries', () {
      final metadata = <String, EmojiEntry>{
        '😀': const EmojiEntry(
          emoji: '😀',
          name: 'grinning face',
          keywords: ['smile'],
        ),
      };
      final slack = {
        '😀': {
          'keywords': [':grinning:', ':smiley:'],
        },
      };

      mergeSlackMetadata(metadata, slack);
      expect(metadata['😀']!.keywords, containsAll([':grinning:', ':smiley:', 'smile']));
    });

    test('creates new entries for unknown emoji', () {
      final metadata = <String, EmojiEntry>{};
      final slack = {
        '🎃': {
          'keywords': [':jack_o_lantern:'],
        },
      };

      mergeSlackMetadata(metadata, slack);
      expect(metadata.containsKey('🎃'), isTrue);
      expect(metadata['🎃']!.name, ''); // No name from Slack
      expect(metadata['🎃']!.keywords, contains(':jack_o_lantern:'));
    });
  });
}
