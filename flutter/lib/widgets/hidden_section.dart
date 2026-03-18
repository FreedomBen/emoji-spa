import 'package:flutter/material.dart';

import 'package:emoji_spa/widgets/emoji_grid.dart';

class HiddenSection extends StatelessWidget {
  final List<String> hiddenEmojis;
  final void Function(String emoji) onEmojiTap;
  final void Function(String emoji, Offset globalPosition) onEmojiSecondaryTap;

  const HiddenSection({
    super.key,
    required this.hiddenEmojis,
    required this.onEmojiTap,
    required this.onEmojiSecondaryTap,
  });

  @override
  Widget build(BuildContext context) {
    if (hiddenEmojis.isEmpty) return const SizedBox.shrink();

    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 8),
        title: Text(
          'Hidden (${hiddenEmojis.length})',
          style: theme.textTheme.bodySmall?.copyWith(fontSize: 13),
        ),
        initiallyExpanded: false,
        children: [
          EmojiGrid(
            emojis: hiddenEmojis,
            onEmojiTap: onEmojiTap,
            onEmojiSecondaryTap: onEmojiSecondaryTap,
          ),
        ],
      ),
    );
  }
}
