import 'package:flutter/material.dart';

import 'package:emoji_spa/theme.dart';

class EmojiButton extends StatefulWidget {
  final String emoji;
  final VoidCallback onTap;
  final void Function(String emoji, Offset globalPosition) onSecondaryTap;

  const EmojiButton({
    super.key,
    required this.emoji,
    required this.onTap,
    required this.onSecondaryTap,
  });

  @override
  State<EmojiButton> createState() => _EmojiButtonState();
}

class _EmojiButtonState extends State<EmojiButton> {
  bool _hovering = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = _hovering
        ? (isDark ? DarkColors.emojiHoverBg : LightColors.emojiHoverBg)
        : (isDark ? DarkColors.emojiBg : LightColors.emojiBg);

    return MouseRegion(
      onEnter: (_) => setState(() => _hovering = true),
      onExit: (_) => setState(() => _hovering = false),
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: widget.onTap,
        onSecondaryTapUp: (details) {
          widget.onSecondaryTap(widget.emoji, details.globalPosition);
        },
        onLongPressStart: (details) {
          widget.onSecondaryTap(widget.emoji, details.globalPosition);
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 100),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(6),
          ),
          alignment: Alignment.center,
          transform: _hovering
              ? (Matrix4.identity()..translateByDouble(0.0, -1.0, 0.0, 0.0))
              : Matrix4.identity(),
          child: Text(
            widget.emoji,
            style: const TextStyle(fontSize: 22),
          ),
        ),
      ),
    );
  }
}
