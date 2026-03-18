import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:emoji_spa/constants.dart';
import 'package:emoji_spa/state/emoji_state.dart';
import 'package:emoji_spa/state/theme_state.dart';
import 'package:emoji_spa/theme.dart';
import 'package:emoji_spa/widgets/usage_table.dart';

Future<void> showSettingsPanel(BuildContext context) {
  return showDialog(
    context: context,
    barrierColor: Theme.of(context).brightness == Brightness.dark
        ? const Color(0xB30F172A) // rgba(15,23,42,0.7)
        : const Color(0x400F172A), // rgba(15,23,42,0.25)
    builder: (ctx) => const _SettingsDialog(),
  );
}

class _SettingsDialog extends StatelessWidget {
  const _SettingsDialog();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final panelBg = isDark ? DarkColors.headerBg : LightColors.headerBg;
    final borderColor = isDark ? DarkColors.border : LightColors.border;
    final fg = isDark ? DarkColors.fg : LightColors.fg;
    final muted = isDark ? DarkColors.muted : LightColors.muted;

    return Dialog(
      backgroundColor: panelBg,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: borderColor),
      ),
      insetPadding: const EdgeInsets.symmetric(horizontal: 40, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560, maxHeight: 700),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 16, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Settings',
                      style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: fg)),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: Icon(Icons.close, color: muted),
                    tooltip: 'Close settings',
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            // Scrollable content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _ThemeSection(fg: fg, muted: muted),
                    const SizedBox(height: 24),
                    _ResetSection(fg: fg, muted: muted),
                    const SizedBox(height: 24),
                    _UsageSectionsToggle(fg: fg, muted: muted),
                    const SizedBox(height: 24),
                    _UsageTableSection(fg: fg, muted: muted),
                    const SizedBox(height: 24),
                    _KeyboardShortcutsSection(fg: fg, muted: muted),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Theme section
// ---------------------------------------------------------------------------

class _ThemeSection extends StatelessWidget {
  final Color fg;
  final Color muted;
  const _ThemeSection({required this.fg, required this.muted});

  @override
  Widget build(BuildContext context) {
    final themeState = context.watch<ThemeState>();

    return _Section(
      title: 'Theme',
      description: 'Choose light, dark, or follow your system theme.',
      fg: fg,
      muted: muted,
      child: RadioGroup<String>(
        groupValue: themeState.preference,
        onChanged: (v) { if (v != null) themeState.setPreference(v); },
        child: Row(
          children: [
            _themeRadio(themeSystem, 'System'),
            const SizedBox(width: 16),
            _themeRadio(themeLight, 'Light'),
            const SizedBox(width: 16),
            _themeRadio(themeDark, 'Dark'),
          ],
        ),
      ),
    );
  }

  Widget _themeRadio(String value, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Radio<String>(value: value),
        GestureDetector(
          onTap: () {},
          child: Text(label, style: TextStyle(color: fg, fontSize: 14)),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Reset section
// ---------------------------------------------------------------------------

class _ResetSection extends StatelessWidget {
  final Color fg;
  final Color muted;
  const _ResetSection({required this.fg, required this.muted});

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: 'Usage history',
      description:
          'Reset emoji usage counts used to power the Frequently Used and Recently Used sections.',
      fg: fg,
      muted: muted,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFDC2626),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        ),
        onPressed: () => _confirmReset(context),
        child: const Text('Reset all usage'),
      ),
    );
  }

  Future<void> _confirmReset(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reset usage'),
        content: const Text(
            'Reset all usage data, pinned emoji, and hidden emoji?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: const Color(0xFFDC2626)),
            child: const Text('Reset'),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      context.read<EmojiAppState>().resetAllUsage();
    }
  }
}

// ---------------------------------------------------------------------------
// Usage sections toggle
// ---------------------------------------------------------------------------

class _UsageSectionsToggle extends StatelessWidget {
  final Color fg;
  final Color muted;
  const _UsageSectionsToggle({required this.fg, required this.muted});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<EmojiAppState>();

    return _Section(
      title: 'Usage sections',
      description:
          'Choose which automatically generated sections are shown in the picker.',
      fg: fg,
      muted: muted,
      child: Column(
        children: [
          _toggle(
            context,
            'Show Frequently Used',
            state.showFrequentlyUsed,
            (v) => state.setShowFrequentlyUsed(v),
          ),
          const SizedBox(height: 4),
          _toggle(
            context,
            'Show Recently Used',
            state.showRecentlyUsed,
            (v) => state.setShowRecentlyUsed(v),
          ),
        ],
      ),
    );
  }

  Widget _toggle(BuildContext context, String label, bool value,
      ValueChanged<bool> onChanged) {
    return Row(
      children: [
        SizedBox(
          width: 20,
          height: 20,
          child: Checkbox(
            value: value,
            onChanged: (v) => onChanged(v ?? false),
          ),
        ),
        const SizedBox(width: 8),
        GestureDetector(
          onTap: () => onChanged(!value),
          child: Text(label, style: TextStyle(color: fg, fontSize: 14)),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Usage table section
// ---------------------------------------------------------------------------

class _UsageTableSection extends StatelessWidget {
  final Color fg;
  final Color muted;
  const _UsageTableSection({required this.fg, required this.muted});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<EmojiAppState>();

    return _Section(
      title: 'Emoji usage table',
      description:
          'Per-emoji usage counts based on how many times you have copied each emoji.',
      fg: fg,
      muted: muted,
      child: UsageTable(
        emojiUsage: state.emojiUsage,
        metadataByEmoji: state.metadataByEmoji,
        getCategoryForEmoji: state.getCategoryForEmoji,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts section
// ---------------------------------------------------------------------------

class _KeyboardShortcutsSection extends StatelessWidget {
  final Color fg;
  final Color muted;
  const _KeyboardShortcutsSection({required this.fg, required this.muted});

  static const _shortcuts = [
    (
      keys: 'Ctrl+S / Cmd+S',
      desc: 'Focus the search field and select the current text.',
    ),
    (
      keys: '\u2190 \u2191 \u2192 \u2193, Home & End',
      desc:
          'Move focus between emojis; \u2191 on the first row jumps back to search, '
              'while \u2193 from the search field jumps into the first emoji.',
    ),
    (
      keys: 'Enter / Space',
      desc: 'Copy the currently focused emoji to the clipboard.',
    ),
    (
      keys: 'Escape',
      desc:
          'Close open overlays/menus, then clear the search field and focus it.',
    ),
    (
      keys: 'Type any letters or numbers',
      desc:
          'Adds characters to the search field while an emoji stays focused, then re-filters results.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: 'Keyboard shortcuts',
      description:
          'All shortcuts also work when navigating with the keyboard inside the picker.',
      fg: fg,
      muted: muted,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: _shortcuts
            .map((s) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 180,
                        child: Text(
                          s.keys,
                          style: TextStyle(
                            color: fg,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          s.desc,
                          style: TextStyle(color: muted, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ))
            .toList(),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Shared section wrapper
// ---------------------------------------------------------------------------

class _Section extends StatelessWidget {
  final String title;
  final String description;
  final Color fg;
  final Color muted;
  final Widget child;

  const _Section({
    required this.title,
    required this.description,
    required this.fg,
    required this.muted,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
            style: TextStyle(
                fontSize: 16, fontWeight: FontWeight.bold, color: fg)),
        const SizedBox(height: 4),
        Text(description, style: TextStyle(fontSize: 13, color: muted)),
        const SizedBox(height: 12),
        child,
      ],
    );
  }
}
