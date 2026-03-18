import 'dart:convert';
import 'dart:io';

// Import the shared emoji generation logic.
// When running via `dart run`, the package root is resolved automatically.
import 'package:emoji_spa/services/emoji_generator.dart';

void main() {
  print('Generating emoji categories...');

  final categories = generateEmojiByCategory();

  var totalCount = 0;
  for (final entry in categories.entries) {
    print('  ${entry.key}: ${entry.value.length} emojis');
    totalCount += entry.value.length;
  }
  print('Total: $totalCount emojis in ${categories.length} categories');

  final outputPath = '${Directory.current.path}/assets/emoji-categories.json';
  final jsonString = const JsonEncoder.withIndent('  ').convert(categories);
  File(outputPath).writeAsStringSync(jsonString);

  print('Written to $outputPath');
}
