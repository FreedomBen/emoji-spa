import 'package:flutter/material.dart';

class EmojiSearchBar extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final FocusNode? focusNode;

  const EmojiSearchBar({
    super.key,
    required this.controller,
    required this.onChanged,
    this.focusNode,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: TextField(
        controller: controller,
        focusNode: focusNode,
        onChanged: onChanged,
        decoration: const InputDecoration(
          hintText: 'Search by emoji or category\u2026',
          isDense: true,
        ),
        style: const TextStyle(fontSize: 14),
      ),
    );
  }
}
