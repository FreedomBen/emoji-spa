import 'dart:async';

import 'package:flutter/material.dart';

import 'package:emoji_spa/constants.dart';

/// Manages a keyboard-focus tooltip overlay for emoji buttons.
class EmojiTooltipController {
  OverlayEntry? _entry;
  Timer? _timer;

  /// Schedule showing a tooltip after [keyboardTooltipDelayMs].
  void schedule(
    BuildContext context, {
    required GlobalKey anchorKey,
    required String emoji,
    required String categoryName,
    required int usageCount,
  }) {
    hide();
    _timer = Timer(const Duration(milliseconds: keyboardTooltipDelayMs), () {
      _show(context,
          anchorKey: anchorKey,
          emoji: emoji,
          categoryName: categoryName,
          usageCount: usageCount);
    });
  }

  void hide() {
    _timer?.cancel();
    _timer = null;
    _entry?.remove();
    _entry = null;
  }

  void _show(
    BuildContext context, {
    required GlobalKey anchorKey,
    required String emoji,
    required String categoryName,
    required int usageCount,
  }) {
    final renderBox =
        anchorKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    final position = renderBox.localToGlobal(Offset.zero);
    final size = renderBox.size;

    final overlay = Overlay.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF020617) : const Color(0xFFFFFFFF);
    final fg = isDark ? const Color(0xFFE5E7EB) : const Color(0xFF111827);
    final border = isDark ? const Color(0xFF1F2937) : const Color(0xFFD1D5DB);

    _entry = OverlayEntry(
      builder: (ctx) => Positioned(
        left: position.dx,
        top: position.dy + size.height + 4,
        child: Material(
          color: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: bg,
              border: Border.all(color: border),
              borderRadius: BorderRadius.circular(4),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(40),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Text(
              '$emoji \u2014 $categoryName (used $usageCount times)',
              style: TextStyle(fontSize: 12, color: fg),
            ),
          ),
        ),
      ),
    );
    overlay.insert(_entry!);
  }

  void dispose() {
    hide();
  }
}
