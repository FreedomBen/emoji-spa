import 'package:flutter/material.dart';

class CategoryDropdown extends StatelessWidget {
  final String selectedCategory;
  final List<String> options;
  final ValueChanged<String> onChanged;

  const CategoryDropdown({
    super.key,
    required this.selectedCategory,
    required this.options,
    required this.onChanged,
  });

  String _displayLabel(String value) {
    if (value == 'all') return 'All categories';
    return value;
  }

  @override
  Widget build(BuildContext context) {
    // Ensure current selection is valid; fall back to 'all'.
    final effective =
        options.contains(selectedCategory) ? selectedCategory : 'all';

    return DropdownButton<String>(
      value: effective,
      isDense: true,
      underline: const SizedBox.shrink(),
      items: options.map((opt) {
        return DropdownMenuItem(
          value: opt,
          child: Text(
            _displayLabel(opt),
            style: const TextStyle(fontSize: 14),
          ),
        );
      }).toList(),
      onChanged: (value) {
        if (value != null) onChanged(value);
      },
    );
  }
}
