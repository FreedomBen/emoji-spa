import 'package:emoji_spa/constants.dart';

/// Emoji regex using Unicode property escapes.
final RegExp _emojiRegex = RegExp(r'\p{Emoji}', unicode: true);

/// Heuristic code point range check for visual emoji.
/// Prevents digits, #, *, etc. that match \p{Emoji} from being included.
bool isEmojiCodePoint(int cp) {
  return (cp >= 0x1F300 && cp <= 0x1FFFF) ||
      (cp >= 0x2600 && cp <= 0x26FF) ||
      (cp >= 0x2700 && cp <= 0x27BF);
}

/// Returns true if [char] is a visual emoji (dual-gate: regex + heuristic).
bool isEmoji(String char) {
  if (char.isEmpty) return false;
  final cp = char.runes.first;

  // Gate 1: Unicode property escape
  if (!_emojiRegex.hasMatch(char)) return false;

  // Gate 2: Heuristic code point ranges
  return isEmojiCodePoint(cp);
}

/// Returns the category name for a given code point.
String getCategory(int cp) {
  for (final range in categoryRanges) {
    if (cp >= range.start && cp <= range.end) return range.name;
  }
  return 'Other Emoji';
}

/// Generates a map of category name → sorted, deduplicated emoji list.
///
/// Iterates code points 0 through [maxCodePoint], applying [isEmoji] and
/// [getCategory] to build the category map.
Map<String, List<String>> generateEmojiByCategoryInternal({
  int maxCodePoint = 0x10FFFF,
  bool Function(String)? isEmojiFn,
  String Function(int)? getCategoryFn,
}) {
  final categories = <String, Set<String>>{};
  final max = maxCodePoint.clamp(0, 0x10FFFF);
  final isEmojiImpl = isEmojiFn ?? isEmoji;
  final getCategoryImpl = getCategoryFn ?? getCategory;

  for (var cp = 0; cp <= max; cp++) {
    final char = String.fromCharCode(cp);
    if (!isEmojiImpl(char)) continue;

    // Skip variation selectors and combining enclosing keycap.
    if (cp == 0xFE0F || cp == 0x20E3) continue;

    final category = getCategoryImpl(cp);
    categories.putIfAbsent(category, () => <String>{});
    categories[category]!.add(char);
  }

  // Sort categories alphabetically, emojis by code point, deduplicated.
  final sortedKeys = categories.keys.toList()..sort();
  final result = <String, List<String>>{};
  for (final key in sortedKeys) {
    final emojis = categories[key]!.toList()
      ..sort((a, b) => a.runes.first.compareTo(b.runes.first));
    result[key] = emojis;
  }

  return result;
}

/// Convenience wrapper with default parameters.
Map<String, List<String>> generateEmojiByCategory() {
  return generateEmojiByCategoryInternal();
}
