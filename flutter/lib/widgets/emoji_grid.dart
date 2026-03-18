import 'package:flutter/material.dart';

import 'package:emoji_spa/widgets/emoji_button.dart';

class EmojiGrid extends StatelessWidget {
  final List<String> emojis;
  final void Function(String emoji) onEmojiTap;
  final void Function(String emoji, Offset globalPosition) onEmojiSecondaryTap;

  const EmojiGrid({
    super.key,
    required this.emojis,
    required this.onEmojiTap,
    required this.onEmojiSecondaryTap,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 4),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 42,
        crossAxisSpacing: 4,
        mainAxisSpacing: 4,
      ),
      itemCount: emojis.length,
      itemBuilder: (context, index) {
        final emoji = emojis[index];
        return EmojiButton(
          emoji: emoji,
          onTap: () => onEmojiTap(emoji),
          onSecondaryTap: onEmojiSecondaryTap,
        );
      },
    );
  }
}

/// A category section: header + emoji grid.
class CategorySection extends StatelessWidget {
  final String categoryName;
  final List<String> emojis;
  final void Function(String emoji) onEmojiTap;
  final void Function(String emoji, Offset globalPosition) onEmojiSecondaryTap;

  const CategorySection({
    super.key,
    required this.categoryName,
    required this.emojis,
    required this.onEmojiTap,
    required this.onEmojiSecondaryTap,
  });

  @override
  Widget build(BuildContext context) {
    if (emojis.isEmpty) return const SizedBox.shrink();

    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 12, 8, 4),
          child: Text(
            '$categoryName (${emojis.length})',
            style: theme.textTheme.bodySmall?.copyWith(fontSize: 13),
          ),
        ),
        EmojiGrid(
          emojis: emojis,
          onEmojiTap: onEmojiTap,
          onEmojiSecondaryTap: onEmojiSecondaryTap,
        ),
      ],
    );
  }
}
