import 'package:flutter_test/flutter_test.dart';
import 'package:emoji_spa/services/emoji_generator.dart';

void main() {
  group('isEmoji', () {
    test('returns true for common visual emoji', () {
      expect(isEmoji('😀'), equals(true));
      expect(isEmoji('🔥'), equals(true));
      // ❄ U+2744 is in dingbats range
      expect(isEmoji('❄'), equals(true));
    });

    test('returns false for digits and ASCII', () {
      expect(isEmoji('0'), equals(false));
      expect(isEmoji('1'), equals(false));
      expect(isEmoji('#'), equals(false));
      expect(isEmoji('*'), equals(false));
      expect(isEmoji('A'), equals(false));
    });

    test('returns false for empty string', () {
      expect(isEmoji(''), equals(false));
    });
  });

  group('isEmojiCodePoint', () {
    test('returns true for emoji code point ranges', () {
      expect(isEmojiCodePoint(0x1F600), equals(true)); // 😀
      expect(isEmojiCodePoint(0x2600), equals(true)); // ☀
      expect(isEmojiCodePoint(0x2700), equals(true)); // ✀
    });

    test('returns false for non-emoji code points', () {
      expect(isEmojiCodePoint(0x0041), equals(false)); // A
      expect(isEmojiCodePoint(0x0030), equals(false)); // 0
    });
  });

  group('getCategory', () {
    test('categorizes smileys', () {
      expect(getCategory(0x1F600), 'Smileys & Emotion');
      expect(getCategory(0x1F64F), 'Smileys & Emotion');
    });

    test('categorizes animals', () {
      expect(getCategory(0x1F400), 'Animals & Nature');
    });

    test('categorizes transport', () {
      expect(getCategory(0x1F680), 'Transport & Map');
    });

    test('categorizes misc symbols', () {
      expect(getCategory(0x2600), 'Misc Symbols');
    });

    test('categorizes dingbats', () {
      expect(getCategory(0x2700), 'Dingbats');
    });

    test('returns Other Emoji for unrecognized ranges', () {
      expect(getCategory(0x0041), 'Other Emoji');
    });
  });

  group('generateEmojiByCategoryInternal', () {
    test('generates categories with emojis', () {
      // Use a small range for speed
      final categories = generateEmojiByCategoryInternal(
        maxCodePoint: 0x1F64F,
      );

      expect(categories.isNotEmpty, equals(true));
      expect(categories.containsKey('Smileys & Emotion'), equals(true));
      expect(categories['Smileys & Emotion']!.isNotEmpty, equals(true));
    });

    test('categories are sorted alphabetically', () {
      final categories = generateEmojiByCategoryInternal(
        maxCodePoint: 0x1F64F,
      );

      final keys = categories.keys.toList();
      final sorted = List<String>.from(keys)..sort();
      expect(keys, sorted);
    });

    test('emojis within categories are sorted by code point', () {
      final categories = generateEmojiByCategoryInternal(
        maxCodePoint: 0x1F64F,
      );

      for (final emojis in categories.values) {
        for (var i = 1; i < emojis.length; i++) {
          expect(
            emojis[i].runes.first,
            greaterThanOrEqualTo(emojis[i - 1].runes.first),
          );
        }
      }
    });

    test('emojis are deduplicated', () {
      final categories = generateEmojiByCategoryInternal(
        maxCodePoint: 0x1F64F,
      );

      for (final emojis in categories.values) {
        expect(emojis.toSet().length, emojis.length);
      }
    });

    test('skips variation selectors', () {
      final categories = generateEmojiByCategoryInternal();
      final allEmojis = categories.values.expand((e) => e).toList();
      expect(allEmojis.contains(String.fromCharCode(0xFE0F)), equals(false));
    });

    test('accepts custom isEmoji and getCategory functions', () {
      final categories = generateEmojiByCategoryInternal(
        maxCodePoint: 0x1F601,
        isEmojiFn: (char) => char == '😀' || char == '😁',
        getCategoryFn: (cp) => 'Custom',
      );

      expect(categories.containsKey('Custom'), equals(true));
      expect(categories['Custom']!.length, 2);
    });
  });

  group('generateEmojiByCategory', () {
    test('generates the full emoji set', () {
      final categories = generateEmojiByCategory();
      expect(categories.isNotEmpty, equals(true));

      var total = 0;
      for (final emojis in categories.values) {
        total += emojis.length;
      }
      expect(total, greaterThan(500));
    });
  });
}
