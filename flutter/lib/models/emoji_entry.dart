/// Emoji metadata entry: character, display name, and search keywords.
class EmojiEntry {
  final String emoji;
  final String name;
  final List<String> keywords;

  const EmojiEntry({
    required this.emoji,
    required this.name,
    this.keywords = const [],
  });

  EmojiEntry copyWith({
    String? emoji,
    String? name,
    List<String>? keywords,
  }) {
    return EmojiEntry(
      emoji: emoji ?? this.emoji,
      name: name ?? this.name,
      keywords: keywords ?? this.keywords,
    );
  }

  @override
  String toString() => 'EmojiEntry($emoji, $name)';
}
