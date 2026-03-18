import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import 'package:emoji_spa/models/emoji_entry.dart';

/// Base emoji metadata (93 entries matching frontend/emoji-data.js).
const List<Map<String, dynamic>> _baseMetadata = [
  // Smileys & Emotion
  {'emoji': '😀', 'name': 'grinning face', 'keywords': ['smile', 'happy', 'joy', 'face']},
  {'emoji': '😃', 'name': 'grinning face with big eyes', 'keywords': ['smile', 'happy', 'joy', 'face']},
  {'emoji': '😄', 'name': 'grinning face with smiling eyes', 'keywords': ['smile', 'happy', 'laugh', 'joy', 'face']},
  {'emoji': '😁', 'name': 'beaming face with smiling eyes', 'keywords': ['smile', 'grin', 'happy', 'joy', 'face']},
  {'emoji': '😆', 'name': 'grinning squinting face', 'keywords': ['laugh', 'lol', 'haha', 'face']},
  {'emoji': '😅', 'name': 'grinning face with sweat', 'keywords': ['nervous', 'relief', 'sweat', 'face']},
  {'emoji': '😂', 'name': 'face with tears of joy', 'keywords': ['lol', 'laugh', 'cry', 'happy', 'funny']},
  {'emoji': '🤣', 'name': 'rolling on the floor laughing', 'keywords': ['rofl', 'laugh', 'lol', 'funny']},
  {'emoji': '😊', 'name': 'smiling face with smiling eyes', 'keywords': ['smile', 'happy', 'warm', 'blush']},
  {'emoji': '😇', 'name': 'smiling face with halo', 'keywords': ['angel', 'innocent', 'good']},
  {'emoji': '🙂', 'name': 'slightly smiling face', 'keywords': ['smile', 'happy', 'face']},
  {'emoji': '🙃', 'name': 'upside-down face', 'keywords': ['sarcasm', 'joking', 'playful']},
  {'emoji': '😉', 'name': 'winking face', 'keywords': ['wink', 'flirt', 'playful']},
  {'emoji': '😍', 'name': 'smiling face with heart-eyes', 'keywords': ['love', 'heart', 'in love', 'crush']},
  {'emoji': '😘', 'name': 'face blowing a kiss', 'keywords': ['kiss', 'love']},
  {'emoji': '😗', 'name': 'kissing face', 'keywords': ['kiss', 'love']},
  {'emoji': '😙', 'name': 'kissing face with smiling eyes', 'keywords': ['kiss', 'smile', 'love']},
  {'emoji': '😚', 'name': 'kissing face with closed eyes', 'keywords': ['kiss', 'love', 'shy']},
  {'emoji': '😋', 'name': 'face savoring food', 'keywords': ['yummy', 'delicious', 'food']},
  {'emoji': '😜', 'name': 'winking face with tongue', 'keywords': ['playful', 'joke', 'silly']},
  {'emoji': '🤪', 'name': 'zany face', 'keywords': ['crazy', 'goofy', 'silly']},
  {'emoji': '😎', 'name': 'smiling face with sunglasses', 'keywords': ['cool', 'swag', 'sunglasses']},
  {'emoji': '🤩', 'name': 'star-struck', 'keywords': ['star', 'amazed', 'excited']},
  {'emoji': '🥰', 'name': 'smiling face with hearts', 'keywords': ['love', 'hearts', 'in love']},
  {'emoji': '😡', 'name': 'pouting face', 'keywords': ['angry', 'mad', 'furious']},
  {'emoji': '😢', 'name': 'crying face', 'keywords': ['sad', 'cry', 'tears']},
  {'emoji': '😭', 'name': 'loudly crying face', 'keywords': ['sad', 'cry', 'sob', 'tears']},
  {'emoji': '😱', 'name': 'face screaming in fear', 'keywords': ['scared', 'shock', 'horror']},
  {'emoji': '😴', 'name': 'sleeping face', 'keywords': ['sleep', 'tired', 'zzz']},
  {'emoji': '🤔', 'name': 'thinking face', 'keywords': ['think', 'hmm', 'question']},
  {'emoji': '🤨', 'name': 'face with raised eyebrow', 'keywords': ['skeptical', 'suspicious']},
  {'emoji': '🤯', 'name': 'exploding head', 'keywords': ['mind blown', 'shock', 'wow']},
  // Hearts / symbols
  {'emoji': '❤️', 'name': 'red heart', 'keywords': ['heart', 'love', 'like', 'favorite']},
  {'emoji': '🧡', 'name': 'orange heart', 'keywords': ['heart', 'love', 'orange']},
  {'emoji': '💛', 'name': 'yellow heart', 'keywords': ['heart', 'love', 'friend']},
  {'emoji': '💚', 'name': 'green heart', 'keywords': ['heart', 'eco', 'environment']},
  {'emoji': '💙', 'name': 'blue heart', 'keywords': ['heart', 'trust', 'loyal']},
  {'emoji': '💜', 'name': 'purple heart', 'keywords': ['heart', 'love', 'purple']},
  {'emoji': '🖤', 'name': 'black heart', 'keywords': ['heart', 'goth', 'dark']},
  {'emoji': '💖', 'name': 'sparkling heart', 'keywords': ['heart', 'love', 'sparkle']},
  {'emoji': '💕', 'name': 'two hearts', 'keywords': ['heart', 'love', 'affection']},
  {'emoji': '💘', 'name': 'heart with arrow', 'keywords': ['heart', 'cupid', 'love']},
  // Hands / gestures
  {'emoji': '👍', 'name': 'thumbs up', 'keywords': ['like', 'approve', 'ok', 'yes']},
  {'emoji': '👎', 'name': 'thumbs down', 'keywords': ['dislike', 'no', 'bad']},
  {'emoji': '👌', 'name': 'OK hand', 'keywords': ['ok', 'fine', 'perfect']},
  {'emoji': '✌️', 'name': 'victory hand', 'keywords': ['peace', 'victory', 'v sign']},
  {'emoji': '🙏', 'name': 'folded hands', 'keywords': ['thanks', 'thank you', 'please', 'pray']},
  {'emoji': '👏', 'name': 'clapping hands', 'keywords': ['clap', 'applause', 'bravo', 'congrats']},
  // People
  {'emoji': '👋', 'name': 'waving hand', 'keywords': ['wave', 'hello', 'hi', 'bye']},
  {'emoji': '🙌', 'name': 'raising hands', 'keywords': ['hooray', 'celebrate', 'praise']},
  {'emoji': '💁\u200D♀️', 'name': 'woman tipping hand', 'keywords': ['sassy', 'information', 'help']},
  {'emoji': '🙆\u200D♂️', 'name': 'man gesturing OK', 'keywords': ['ok', 'gesture', 'yes']},
  // Animals & Nature
  {'emoji': '🐶', 'name': 'dog face', 'keywords': ['dog', 'puppy', 'pet', 'animal']},
  {'emoji': '🐱', 'name': 'cat face', 'keywords': ['cat', 'kitty', 'pet', 'animal']},
  {'emoji': '🐭', 'name': 'mouse face', 'keywords': ['mouse', 'rodent', 'animal']},
  {'emoji': '🐹', 'name': 'hamster face', 'keywords': ['hamster', 'pet', 'animal']},
  {'emoji': '🐰', 'name': 'rabbit face', 'keywords': ['rabbit', 'bunny', 'animal']},
  {'emoji': '🦊', 'name': 'fox face', 'keywords': ['fox', 'animal']},
  {'emoji': '🐻', 'name': 'bear face', 'keywords': ['bear', 'animal']},
  {'emoji': '🐼', 'name': 'panda face', 'keywords': ['panda', 'bear', 'animal']},
  {'emoji': '🐨', 'name': 'koala', 'keywords': ['koala', 'bear', 'animal']},
  {'emoji': '🐯', 'name': 'tiger face', 'keywords': ['tiger', 'animal', 'cat']},
  {'emoji': '🦁', 'name': 'lion face', 'keywords': ['lion', 'animal', 'cat']},
  {'emoji': '🐸', 'name': 'frog', 'keywords': ['frog', 'animal']},
  {'emoji': '🐵', 'name': 'monkey face', 'keywords': ['monkey', 'animal']},
  // Food & Drink
  {'emoji': '🍎', 'name': 'red apple', 'keywords': ['apple', 'fruit', 'food']},
  {'emoji': '🍌', 'name': 'banana', 'keywords': ['banana', 'fruit', 'food']},
  {'emoji': '🍇', 'name': 'grapes', 'keywords': ['grapes', 'fruit', 'food']},
  {'emoji': '🍕', 'name': 'pizza', 'keywords': ['pizza', 'food', 'slice']},
  {'emoji': '🍔', 'name': 'hamburger', 'keywords': ['burger', 'hamburger', 'food']},
  {'emoji': '🍟', 'name': 'french fries', 'keywords': ['fries', 'food']},
  {'emoji': '🌭', 'name': 'hot dog', 'keywords': ['hotdog', 'sausage', 'food']},
  {'emoji': '🍣', 'name': 'sushi', 'keywords': ['sushi', 'japanese', 'food']},
  {'emoji': '🍩', 'name': 'doughnut', 'keywords': ['donut', 'doughnut', 'dessert']},
  {'emoji': '🎂', 'name': 'birthday cake', 'keywords': ['cake', 'birthday', 'dessert']},
  // Travel & Places
  {'emoji': '✈️', 'name': 'airplane', 'keywords': ['airplane', 'flight', 'travel', 'plane']},
  {'emoji': '🚗', 'name': 'automobile', 'keywords': ['car', 'auto', 'vehicle']},
  {'emoji': '🚕', 'name': 'taxi', 'keywords': ['taxi', 'cab', 'car']},
  {'emoji': '🚙', 'name': 'sport utility vehicle', 'keywords': ['suv', 'car', 'vehicle']},
  {'emoji': '🚀', 'name': 'rocket', 'keywords': ['rocket', 'space', 'ship', 'launch']},
  {'emoji': '🛳️', 'name': 'passenger ship', 'keywords': ['ship', 'boat', 'cruise']},
  // Objects / misc symbols
  {'emoji': '⭐', 'name': 'star', 'keywords': ['star', 'favorite']},
  {'emoji': '🌟', 'name': 'glowing star', 'keywords': ['star', 'glow', 'bright']},
  {'emoji': '✨', 'name': 'sparkles', 'keywords': ['sparkle', 'magic', 'stars']},
  {'emoji': '⚡', 'name': 'high voltage', 'keywords': ['lightning', 'electric', 'zap']},
  {'emoji': '🔥', 'name': 'fire', 'keywords': ['fire', 'lit', 'hot', 'flame']},
  {'emoji': '💧', 'name': 'droplet', 'keywords': ['water', 'drop']},
  {'emoji': '❄️', 'name': 'snowflake', 'keywords': ['snow', 'winter', 'cold']},
  {'emoji': '🎉', 'name': 'party popper', 'keywords': ['party', 'celebration', 'congrats']},
  {'emoji': '🎁', 'name': 'wrapped gift', 'keywords': ['gift', 'present', 'birthday', 'christmas']},
  {'emoji': '✅', 'name': 'check mark button', 'keywords': ['check', 'done', 'complete', 'yes']},
  {'emoji': '❌', 'name': 'cross mark', 'keywords': ['x', 'no', 'wrong', 'error']},
];

/// Builds the base metadata map from the hardcoded entries.
Map<String, EmojiEntry> buildBaseMetadata() {
  final map = <String, EmojiEntry>{};
  for (final entry in _baseMetadata) {
    final emoji = entry['emoji'] as String;
    map[emoji] = EmojiEntry(
      emoji: emoji,
      name: entry['name'] as String,
      keywords: List<String>.from(entry['keywords'] as List),
    );
  }
  return map;
}

/// Loads and parses a JSON asset file containing emoji metadata.
/// Returns a map of emoji → {name, keywords}.
Future<Map<String, dynamic>> _loadJsonAsset(String assetPath) async {
  final jsonString = await rootBundle.loadString(assetPath);
  return json.decode(jsonString) as Map<String, dynamic>;
}

/// Loads CLDR metadata from assets/emoji-cldr.json.
Future<Map<String, dynamic>> loadCldrMetadata() {
  return _loadJsonAsset('assets/emoji-cldr.json');
}

/// Loads Slack metadata from assets/emoji-slack.json.
Future<Map<String, dynamic>> loadSlackMetadata() {
  return _loadJsonAsset('assets/emoji-slack.json');
}

/// Merges CLDR overlay into the metadata map.
/// CLDR name overrides base name only if base doesn't have one.
/// Keywords are unioned (deduplicated).
void mergeCldrMetadata(
  Map<String, EmojiEntry> metadata,
  Map<String, dynamic> cldrData,
) {
  for (final entry in cldrData.entries) {
    final emoji = entry.key;
    final data = entry.value;
    if (data is! Map<String, dynamic>) continue;

    final cldrName = data['name'] as String? ?? '';
    final cldrKeywords = <String>[
      if (data['keywords'] is List)
        ...(data['keywords'] as List).cast<String>(),
    ];

    if (metadata.containsKey(emoji)) {
      final existing = metadata[emoji]!;
      // Only override name if base doesn't have one
      final name = existing.name.isEmpty ? cldrName : existing.name;
      // Union keywords
      final keywords = {...existing.keywords, ...cldrKeywords}.toList();
      metadata[emoji] = existing.copyWith(name: name, keywords: keywords);
    } else {
      metadata[emoji] = EmojiEntry(
        emoji: emoji,
        name: cldrName,
        keywords: cldrKeywords,
      );
    }
  }
}

/// Merges Slack keyword overlay into the metadata map.
/// Keywords are unioned (deduplicated).
void mergeSlackMetadata(
  Map<String, EmojiEntry> metadata,
  Map<String, dynamic> slackData,
) {
  for (final entry in slackData.entries) {
    final emoji = entry.key;
    final data = entry.value;
    if (data is! Map<String, dynamic>) continue;

    final slackKeywords = <String>[
      if (data['keywords'] is List)
        ...(data['keywords'] as List).cast<String>(),
    ];

    if (metadata.containsKey(emoji)) {
      final existing = metadata[emoji]!;
      final keywords = {...existing.keywords, ...slackKeywords}.toList();
      metadata[emoji] = existing.copyWith(keywords: keywords);
    } else {
      metadata[emoji] = EmojiEntry(
        emoji: emoji,
        name: '',
        keywords: slackKeywords,
      );
    }
  }
}

/// Loads all metadata sources and merges them.
/// Returns the complete metadata map.
Future<Map<String, EmojiEntry>> loadAndMergeAllMetadata() async {
  final metadata = buildBaseMetadata();

  final results = await Future.wait([
    loadCldrMetadata(),
    loadSlackMetadata(),
  ]);

  mergeCldrMetadata(metadata, results[0]);
  mergeSlackMetadata(metadata, results[1]);

  return metadata;
}
