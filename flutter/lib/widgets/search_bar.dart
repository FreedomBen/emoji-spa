import 'package:flutter/material.dart';

class EmojiSearchBar extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  const EmojiSearchBar({
    super.key,
    required this.controller,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: TextField(
        controller: controller,
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
