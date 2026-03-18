import 'package:flutter/material.dart';

import 'package:emoji_spa/theme.dart';

/// Shows a context menu for an emoji at the given global position.
Future<String?> showEmojiContextMenu(
  BuildContext context, {
  required Offset position,
  required bool isPinned,
  required bool isHidden,
}) {
  final isDark = Theme.of(context).brightness == Brightness.dark;
  final bgColor = isDark ? DarkColors.contextBg : LightColors.contextBg;

  final overlay = Overlay.of(context);
  final renderBox = overlay.context.findRenderObject() as RenderBox;
  final relativePosition = renderBox.globalToLocal(position);

  return showMenu<String>(
    context: context,
    position: RelativeRect.fromLTRB(
      relativePosition.dx,
      relativePosition.dy,
      relativePosition.dx,
      relativePosition.dy,
    ),
    color: bgColor,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
    items: [
      PopupMenuItem(
        value: 'toggle-pin',
        child: Text(isPinned ? 'Unpin' : 'Pin'),
      ),
      PopupMenuItem(
        value: 'toggle-hide',
        child: Text(isHidden ? 'Unhide' : 'Hide'),
      ),
      const PopupMenuItem(
        value: 'reset-usage',
        child: Text('Reset usage count'),
      ),
    ],
  );
}
