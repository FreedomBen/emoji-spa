import 'package:flutter/material.dart';

import 'package:emoji_spa/models/emoji_entry.dart';
import 'package:emoji_spa/models/usage_record.dart';

class UsageTable extends StatelessWidget {
  final Map<String, UsageRecord> emojiUsage;
  final Map<String, EmojiEntry> metadataByEmoji;
  final String Function(String emoji) getCategoryForEmoji;

  const UsageTable({
    super.key,
    required this.emojiUsage,
    required this.metadataByEmoji,
    required this.getCategoryForEmoji,
  });

  @override
  Widget build(BuildContext context) {
    if (emojiUsage.isEmpty) {
      return Text(
        'No usage data yet.',
        style: Theme.of(context).textTheme.bodySmall,
      );
    }

    // Sort by count descending.
    final sorted = emojiUsage.entries.toList()
      ..sort((a, b) => b.value.count.compareTo(a.value.count));

    final theme = Theme.of(context);
    final headerStyle = theme.textTheme.bodySmall
        ?.copyWith(fontWeight: FontWeight.bold, fontSize: 12);
    final cellStyle = theme.textTheme.bodySmall?.copyWith(fontSize: 12);
    final borderColor = theme.dividerColor;

    return Container(
      constraints: const BoxConstraints(maxHeight: 300),
      decoration: BoxDecoration(
        border: Border.all(color: borderColor),
        borderRadius: BorderRadius.circular(6),
      ),
      child: SingleChildScrollView(
        child: Table(
          columnWidths: const {
            0: FixedColumnWidth(50),
            1: FlexColumnWidth(2),
            2: FlexColumnWidth(2),
            3: FixedColumnWidth(60),
          },
          defaultVerticalAlignment: TableCellVerticalAlignment.middle,
          children: [
            TableRow(
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: borderColor)),
              ),
              children: [
                _headerCell('Emoji', headerStyle),
                _headerCell('Name', headerStyle),
                _headerCell('Category', headerStyle),
                _headerCell('Count', headerStyle),
              ],
            ),
            ...sorted.map((entry) {
              final emoji = entry.key;
              final meta = metadataByEmoji[emoji];
              final name = meta?.name ?? '';
              final category = getCategoryForEmoji(emoji);
              return TableRow(
                decoration: BoxDecoration(
                  border: Border(
                      bottom: BorderSide(color: borderColor.withAlpha(80))),
                ),
                children: [
                  _cell(emoji, cellStyle, center: true),
                  _cell(name, cellStyle),
                  _cell(category, cellStyle),
                  _cell('${entry.value.count}', cellStyle, center: true),
                ],
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _headerCell(String text, TextStyle? style) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: Text(text, style: style),
    );
  }

  Widget _cell(String text, TextStyle? style, {bool center = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Text(
        text,
        style: style,
        textAlign: center ? TextAlign.center : TextAlign.left,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}
