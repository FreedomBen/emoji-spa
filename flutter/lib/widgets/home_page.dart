import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:emoji_spa/services/clipboard_service.dart';
import 'package:emoji_spa/state/emoji_state.dart';
import 'package:emoji_spa/theme.dart';
import 'package:emoji_spa/widgets/category_dropdown.dart';
import 'package:emoji_spa/widgets/context_menu.dart';
import 'package:emoji_spa/widgets/emoji_grid.dart';
import 'package:emoji_spa/widgets/search_bar.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final TextEditingController _searchController = TextEditingController();
  final ClipboardService _clipboard = ClipboardService();
  final ScrollController _scrollController = ScrollController();

  String _statusMessage = '';

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    context.read<EmojiAppState>().setSearchQuery(query);
  }

  void _onCategoryChanged(String category) {
    final state = context.read<EmojiAppState>();
    state.setSelectedCategory(category);
    // Reset scroll position when category changes.
    _scrollController.jumpTo(0);
  }

  Future<void> _onEmojiTap(String emoji) async {
    final state = context.read<EmojiAppState>();
    final ok = await _clipboard.copy(emoji);
    state.recordUsage(emoji);
    setState(() {
      _statusMessage = ok ? 'Copied $emoji' : 'Failed to copy';
    });
  }

  Future<void> _onEmojiSecondaryTap(
      String emoji, Offset globalPosition) async {
    final state = context.read<EmojiAppState>();
    final action = await showEmojiContextMenu(
      context,
      position: globalPosition,
      isPinned: state.isPinned(emoji),
      isHidden: state.isHidden(emoji),
    );
    if (action == null) return;
    switch (action) {
      case 'toggle-pin':
        state.isPinned(emoji) ? state.unpinEmoji(emoji) : state.pinEmoji(emoji);
      case 'toggle-hide':
        state.isHidden(emoji)
            ? state.unhideEmoji(emoji)
            : state.hideEmoji(emoji);
      case 'reset-usage':
        state.resetUsage(emoji);
    }
  }

  // Build the list of category sections to display.
  List<Widget> _buildCategorySections(EmojiAppState state) {
    final selected = state.selectedCategory;
    final sections = <Widget>[];

    if (selected == 'all' || selected == 'Pinned') {
      _addPinnedSection(state, sections);
    }

    if (selected == 'all' || selected == 'Frequently Used') {
      _addFrequentSection(state, sections);
    }

    if (selected == 'all' || selected == 'Recently Used') {
      _addRecentSection(state, sections);
    }

    if (selected == 'Hidden') {
      _addHiddenSection(state, sections);
    } else if (selected == 'Pinned' ||
        selected == 'Frequently Used' ||
        selected == 'Recently Used') {
      // Special section already handled above — nothing more to add.
    } else {
      // Regular categories.
      _addRegularCategories(state, sections, selected);
    }

    return sections;
  }

  void _addPinnedSection(EmojiAppState state, List<Widget> sections) {
    if (state.pinnedEmojis.isEmpty) return;
    final pinned = state.pinnedEmojis
        .where((e) => state.emojiMatchesSearch(e, state.getCategoryForEmoji(e)))
        .toList();
    if (pinned.isEmpty) return;
    sections.add(CategorySection(
      categoryName: 'Pinned',
      emojis: pinned,
      onEmojiTap: _onEmojiTap,
      onEmojiSecondaryTap: _onEmojiSecondaryTap,
    ));
  }

  void _addFrequentSection(EmojiAppState state, List<Widget> sections) {
    if (!state.showFrequentlyUsed) return;
    final frequent = state.getFrequentlyUsedEmojis();
    if (frequent.isEmpty) return;
    final filtered = frequent
        .where((e) =>
            !state.isHidden(e) &&
            state.emojiMatchesSearch(e, state.getCategoryForEmoji(e)))
        .toList();
    if (filtered.isEmpty) return;
    sections.add(CategorySection(
      categoryName: 'Frequently Used',
      emojis: filtered,
      onEmojiTap: _onEmojiTap,
      onEmojiSecondaryTap: _onEmojiSecondaryTap,
    ));
  }

  void _addRecentSection(EmojiAppState state, List<Widget> sections) {
    if (!state.showRecentlyUsed) return;
    final frequentSet =
        state.showFrequentlyUsed ? state.getFrequentlyUsedEmojis().toSet() : <String>{};
    final recent = state.getRecentlyUsedEmojis(excludeSet: frequentSet);
    if (recent.isEmpty) return;
    final filtered = recent
        .where((e) =>
            !state.isHidden(e) &&
            state.emojiMatchesSearch(e, state.getCategoryForEmoji(e)))
        .toList();
    if (filtered.isEmpty) return;
    sections.add(CategorySection(
      categoryName: 'Recently Used',
      emojis: filtered,
      onEmojiTap: _onEmojiTap,
      onEmojiSecondaryTap: _onEmojiSecondaryTap,
    ));
  }

  void _addHiddenSection(EmojiAppState state, List<Widget> sections) {
    if (state.hiddenEmojis.isEmpty) return;
    final hidden = state.hiddenEmojis
        .where((e) => state.emojiMatchesSearch(e, state.getCategoryForEmoji(e)))
        .toList();
    if (hidden.isEmpty) return;
    sections.add(CategorySection(
      categoryName: 'Hidden',
      emojis: hidden,
      onEmojiTap: _onEmojiTap,
      onEmojiSecondaryTap: _onEmojiSecondaryTap,
    ));
  }

  void _addRegularCategories(
      EmojiAppState state, List<Widget> sections, String selected) {
    final categoriesToShow = selected == 'all'
        ? (state.allCategories.keys.toList()..sort())
        : [selected];

    if (state.groupByCategory) {
      for (final cat in categoriesToShow) {
        final emojis = state.allCategories[cat];
        if (emojis == null) continue;
        final filtered = state.getFilteredEmojis(cat, emojis);
        if (filtered.isEmpty) continue;
        sections.add(CategorySection(
          categoryName: cat,
          emojis: filtered,
          onEmojiTap: _onEmojiTap,
          onEmojiSecondaryTap: _onEmojiSecondaryTap,
        ));
      }
    } else {
      // Flat list — no category headers.
      final allEmojis = <String>[];
      for (final cat in categoriesToShow) {
        final emojis = state.allCategories[cat];
        if (emojis == null) continue;
        allEmojis.addAll(state.getFilteredEmojis(cat, emojis));
      }
      if (allEmojis.isNotEmpty) {
        sections.add(EmojiGrid(
          emojis: allEmojis,
          onEmojiTap: _onEmojiTap,
          onEmojiSecondaryTap: _onEmojiSecondaryTap,
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<EmojiAppState>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final headerBg = isDark ? DarkColors.headerBg : LightColors.headerBg;
    final borderColor = isDark ? DarkColors.border : LightColors.border;
    final mutedColor = isDark ? DarkColors.muted : LightColors.muted;

    if (state.isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    // Ensure selected category is still valid.
    final options = state.categoryOptions;
    if (!options.contains(state.selectedCategory)) {
      // Defer to next frame to avoid modifying state during build.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        state.setSelectedCategory('all');
      });
    }

    final sections = _buildCategorySections(state);

    return Scaffold(
      body: Column(
        children: [
          // Sticky header
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            decoration: BoxDecoration(
              color: headerBg,
              border: Border(
                bottom: BorderSide(color: borderColor),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title row
                Row(
                  children: [
                    Text(
                      'Emoji Spa',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(width: 12),
                    if (_statusMessage.isNotEmpty)
                      Text(
                        _statusMessage,
                        style: TextStyle(fontSize: 13, color: mutedColor),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                // Controls row
                Row(
                  children: [
                    EmojiSearchBar(
                      controller: _searchController,
                      onChanged: _onSearchChanged,
                    ),
                    const SizedBox(width: 8),
                    CategoryDropdown(
                      selectedCategory: state.selectedCategory,
                      options: options,
                      onChanged: _onCategoryChanged,
                    ),
                    const SizedBox(width: 8),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: Checkbox(
                            value: state.groupByCategory,
                            onChanged: (v) =>
                                state.setGroupByCategory(v ?? true),
                          ),
                        ),
                        const SizedBox(width: 4),
                        GestureDetector(
                          onTap: () =>
                              state.setGroupByCategory(!state.groupByCategory),
                          child: Text(
                            'Group by category',
                            style: Theme.of(context).textTheme.labelMedium,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Scrollable body
          Expanded(
            child: SingleChildScrollView(
              controller: _scrollController,
              padding: const EdgeInsets.only(bottom: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (state.shouldShowHiddenHint)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                      child: Text(
                        'Some hidden emoji match your search. Try the Hidden section.',
                        style: TextStyle(
                          fontSize: 13,
                          color: mutedColor,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                  ...sections,
                  if (sections.isEmpty && !state.shouldShowHiddenHint)
                    Padding(
                      padding: const EdgeInsets.all(24),
                      child: Center(
                        child: Text(
                          'No emoji found.',
                          style: TextStyle(color: mutedColor),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
