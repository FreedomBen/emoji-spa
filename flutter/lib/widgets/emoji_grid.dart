import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:emoji_spa/widgets/emoji_button.dart';

class EmojiGrid extends StatefulWidget {
  final List<String> emojis;
  final void Function(String emoji) onEmojiTap;
  final void Function(String emoji, Offset globalPosition) onEmojiSecondaryTap;
  final FocusNode? searchFocusNode;
  final TextEditingController? searchController;
  final ValueChanged<String>? onSearchChanged;
  final void Function(String emoji, bool focused, GlobalKey anchorKey)?
      onEmojiFocusChange;

  const EmojiGrid({
    super.key,
    required this.emojis,
    required this.onEmojiTap,
    required this.onEmojiSecondaryTap,
    this.searchFocusNode,
    this.searchController,
    this.onSearchChanged,
    this.onEmojiFocusChange,
  });

  @override
  State<EmojiGrid> createState() => _EmojiGridState();
}

class _EmojiGridState extends State<EmojiGrid> {
  final List<FocusNode> _focusNodes = [];
  final List<GlobalKey> _keys = [];

  @override
  void initState() {
    super.initState();
    _syncNodes(widget.emojis.length);
  }

  @override
  void didUpdateWidget(EmojiGrid oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.emojis.length != _focusNodes.length) {
      _syncNodes(widget.emojis.length);
    }
  }

  void _syncNodes(int count) {
    while (_focusNodes.length < count) {
      _focusNodes.add(FocusNode());
      _keys.add(GlobalKey());
    }
    while (_focusNodes.length > count) {
      _focusNodes.removeLast().dispose();
      _keys.removeLast();
    }
  }

  @override
  void dispose() {
    for (final node in _focusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  int _getColumnsFromWidth(double width) {
    // maxCrossAxisExtent=42 with 4px spacing
    if (width <= 0) return 1;
    return (width / 46).floor().clamp(1, 999);
  }

  void _handleGridKeyEvent(int index, KeyEvent event) {
    if (event is! KeyDownEvent) return;
    final key = event.logicalKey;

    // Type-to-search: printable character without Ctrl/Alt/Meta
    if (!HardwareKeyboard.instance.isControlPressed &&
        !HardwareKeyboard.instance.isAltPressed &&
        !HardwareKeyboard.instance.isMetaPressed &&
        key != LogicalKeyboardKey.enter &&
        key != LogicalKeyboardKey.space &&
        key != LogicalKeyboardKey.escape &&
        key != LogicalKeyboardKey.tab) {
      if (key == LogicalKeyboardKey.backspace) {
        final ctrl = widget.searchController;
        if (ctrl != null && ctrl.text.isNotEmpty) {
          ctrl.text = ctrl.text.substring(0, ctrl.text.length - 1);
          widget.onSearchChanged?.call(ctrl.text);
        }
        return;
      }

      final char = event.character;
      if (char != null && char.isNotEmpty && !char.startsWith('\x00')) {
        final ctrl = widget.searchController;
        if (ctrl != null) {
          ctrl.text += char;
          ctrl.selection =
              TextSelection.collapsed(offset: ctrl.text.length);
          widget.onSearchChanged?.call(ctrl.text);
        }
        return;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = _getColumnsFromWidth(constraints.maxWidth - 8);

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 4),
          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: 42,
            crossAxisSpacing: 4,
            mainAxisSpacing: 4,
          ),
          itemCount: widget.emojis.length,
          itemBuilder: (context, index) {
            final emoji = widget.emojis[index];
            return KeyboardListener(
              focusNode: FocusNode(skipTraversal: true),
              onKeyEvent: (event) {
                if (event is! KeyDownEvent) return;
                final key = event.logicalKey;

                if (key == LogicalKeyboardKey.arrowRight) {
                  _moveFocus(index, index + 1);
                } else if (key == LogicalKeyboardKey.arrowLeft) {
                  _moveFocus(index, index - 1);
                } else if (key == LogicalKeyboardKey.arrowDown) {
                  _moveFocus(index, index + columns);
                } else if (key == LogicalKeyboardKey.arrowUp) {
                  if (index < columns) {
                    // First row — jump to search.
                    widget.searchFocusNode?.requestFocus();
                  } else {
                    _moveFocus(index, index - columns);
                  }
                } else if (key == LogicalKeyboardKey.home) {
                  _moveFocus(index, 0);
                } else if (key == LogicalKeyboardKey.end) {
                  _moveFocus(index, widget.emojis.length - 1);
                } else {
                  _handleGridKeyEvent(index, event);
                }
              },
              child: EmojiButton(
                key: _keys[index],
                emoji: emoji,
                onTap: () => widget.onEmojiTap(emoji),
                onSecondaryTap: widget.onEmojiSecondaryTap,
                focusNode: _focusNodes[index],
                onFocusChange: (focused) {
                  widget.onEmojiFocusChange
                      ?.call(emoji, focused, _keys[index]);
                },
              ),
            );
          },
        );
      },
    );
  }

  void _moveFocus(int from, int to) {
    if (to < 0 || to >= _focusNodes.length) return;
    _focusNodes[to].requestFocus();
  }

  /// Request focus on the first emoji. Called externally.
  void focusFirst() {
    if (_focusNodes.isNotEmpty) _focusNodes[0].requestFocus();
  }
}

/// A category section: header + emoji grid.
class CategorySection extends StatelessWidget {
  final String categoryName;
  final List<String> emojis;
  final void Function(String emoji) onEmojiTap;
  final void Function(String emoji, Offset globalPosition) onEmojiSecondaryTap;
  final FocusNode? searchFocusNode;
  final TextEditingController? searchController;
  final ValueChanged<String>? onSearchChanged;
  final void Function(String emoji, bool focused, GlobalKey anchorKey)?
      onEmojiFocusChange;

  const CategorySection({
    super.key,
    required this.categoryName,
    required this.emojis,
    required this.onEmojiTap,
    required this.onEmojiSecondaryTap,
    this.searchFocusNode,
    this.searchController,
    this.onSearchChanged,
    this.onEmojiFocusChange,
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
          searchFocusNode: searchFocusNode,
          searchController: searchController,
          onSearchChanged: onSearchChanged,
          onEmojiFocusChange: onEmojiFocusChange,
        ),
      ],
    );
  }
}
