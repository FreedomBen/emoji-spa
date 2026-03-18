import 'package:flutter_test/flutter_test.dart';
import 'package:emoji_spa/constants.dart';
import 'package:emoji_spa/models/emoji_entry.dart';

// Inline search logic matching the spec (§5.1–5.3) for unit testing.
// This will be extracted into a service in Phase 2.

/// Tokenizes a search query: splits by whitespace, filters empty strings.
List<String> tokenizeQuery(String query) {
  return query.split(RegExp(r'\s+')).where((t) => t.isNotEmpty).toList();
}

/// Checks if a single emoji matches all search tokens.
bool emojiMatchesTokens(
  String emoji,
  String categoryName,
  Map<String, EmojiEntry> metadataByEmoji,
  List<String> tokens,
) {
  if (tokens.isEmpty) return true;

  for (final token in tokens) {
    final lower = token.toLowerCase();
    var matched = false;

    // 1. Emoji character itself
    if (emoji.toLowerCase().contains(lower)) {
      matched = true;
    }

    // 2. Category name
    if (!matched && categoryName.toLowerCase().contains(lower)) {
      matched = true;
    }

    // 3. Category keywords
    if (!matched) {
      final catKeywords = categoryKeywords[categoryName] ?? [];
      for (final kw in catKeywords) {
        if (kw.toLowerCase().contains(lower)) {
          matched = true;
          break;
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

void main() {
  group('tokenizeQuery', () {
    test('splits by whitespace', () {
      expect(tokenizeQuery('hello world'), ['hello', 'world']);
    });

    test('filters empty tokens', () {
      expect(tokenizeQuery('  hello   world  '), ['hello', 'world']);
    });

    test('returns empty list for empty string', () {
      expect(tokenizeQuery(''), isEmpty);
    });

    test('returns empty list for whitespace only', () {
      expect(tokenizeQuery('   '), isEmpty);
    });

    test('single token', () {
      expect(tokenizeQuery('smile'), ['smile']);
    });
  });

  group('emojiMatchesTokens', () {
    final metadata = <String, EmojiEntry>{
      '😀': const EmojiEntry(
        emoji: '😀',
        name: 'grinning face',
        keywords: ['smile', 'happy', 'joy'],
      ),
      '🔥': const EmojiEntry(
        emoji: '🔥',
        name: 'fire',
        keywords: ['fire', 'lit', 'hot', 'flame'],
      ),
      '🐶': const EmojiEntry(
        emoji: '🐶',
        name: 'dog face',
        keywords: ['dog', 'puppy', 'pet', 'animal'],
      ),
    };

    test('matches with empty tokens (returns all)', () {
      expect(
        emojiMatchesTokens('😀', 'Smileys & Emotion', metadata, []),
        isTrue,
      );
    });

    test('matches by metadata name', () {
      expect(
        emojiMatchesTokens('😀', 'Smileys & Emotion', metadata, ['grinning']),
        isTrue,
      );
    });

    test('matches by metadata keyword', () {
      expect(
        emojiMatchesTokens('😀', 'Smileys & Emotion', metadata, ['smile']),
        isTrue,
      );
    });

    test('matches by category name', () {
      expect(
        emojiMatchesTokens('😀', 'Smileys & Emotion', metadata, ['smiley']),
        isTrue,
      );
    });

    test('matches by category keyword', () {
      expect(
        emojiMatchesTokens('🐶', 'Animals & Nature', metadata, ['pet']),
        isTrue,
      );
    });

    test('AND logic: all tokens must match', () {
      // Both 'fire' and 'hot' match
      expect(
        emojiMatchesTokens('🔥', 'Misc Symbols', metadata, ['fire', 'hot']),
        isTrue,
      );

      // 'fire' matches but 'puppy' does not
      expect(
        emojiMatchesTokens('🔥', 'Misc Symbols', metadata, ['fire', 'puppy']),
        isFalse,
      );
    });

    test('case insensitive matching', () {
      expect(
        emojiMatchesTokens('😀', 'Smileys & Emotion', metadata, ['GRINNING']),
        isTrue,
      );
      expect(
        emojiMatchesTokens('😀', 'Smileys & Emotion', metadata, ['Happy']),
        isTrue,
      );
    });

    test('substring matching', () {
      expect(
        emojiMatchesTokens('😀', 'Smileys & Emotion', metadata, ['grin']),
        isTrue,
      );
    });

    test('no match for unrelated query', () {
      expect(
        emojiMatchesTokens('😀', 'Smileys & Emotion', metadata, ['pizza']),
        isFalse,
      );
    });

    test('emoji without metadata only matches category', () {
      expect(
        emojiMatchesTokens('🎭', 'Other Emoji', metadata, ['emoji']),
        isTrue, // matches category keyword
      );
      expect(
        emojiMatchesTokens('🎭', 'Other Emoji', metadata, ['pizza']),
        isFalse,
      );
    });
  });
}
