import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:emoji_spa/app.dart';
import 'package:emoji_spa/services/storage_service.dart';
import 'package:emoji_spa/state/emoji_state.dart';
import 'package:emoji_spa/state/theme_state.dart';
import 'package:emoji_spa/widgets/emoji_button.dart';
import 'package:emoji_spa/widgets/emoji_grid.dart';
import 'package:emoji_spa/widgets/category_dropdown.dart';
import 'package:emoji_spa/widgets/search_bar.dart';
import 'package:emoji_spa/widgets/hidden_section.dart';

// Helper to create an app shell with providers and a known state.
Widget _buildTestApp({required Widget child}) {
  return MaterialApp(
    home: Scaffold(body: child),
  );
}

Widget _buildProvidedApp() {
  SharedPreferences.setMockInitialValues({});
  final storage = StorageService();
  return MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => ThemeState(storage)..initialize()),
      ChangeNotifierProvider(
          create: (_) => EmojiAppState(storage)..initialize()),
    ],
    child: const EmojiSpaApp(),
  );
}

void main() {
  group('EmojiSpaApp', () {
    testWidgets('renders without error', (tester) async {
      await tester.pumpWidget(_buildProvidedApp());
      expect(find.byType(EmojiSpaApp), findsOneWidget);
    });

    testWidgets('shows loading indicator initially', (tester) async {
      await tester.pumpWidget(_buildProvidedApp());
      // On first frame, state is loading — CircularProgressIndicator shown.
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });

  group('EmojiButton', () {
    testWidgets('renders emoji text', (tester) async {
      await tester.pumpWidget(_buildTestApp(
        child: EmojiButton(
          emoji: '\u{1F600}',
          onTap: () {},
          onSecondaryTap: (_, __) {},
        ),
      ));
      expect(find.text('\u{1F600}'), findsOneWidget);
    });

    testWidgets('calls onTap when tapped', (tester) async {
      var tapped = false;
      await tester.pumpWidget(_buildTestApp(
        child: EmojiButton(
          emoji: '\u{1F600}',
          onTap: () => tapped = true,
          onSecondaryTap: (_, __) {},
        ),
      ));
      await tester.tap(find.text('\u{1F600}'));
      expect(tapped, isTrue);
    });

    testWidgets('shows focus ring when focused', (tester) async {
      final focusNode = FocusNode();
      await tester.pumpWidget(_buildTestApp(
        child: EmojiButton(
          emoji: '\u{1F600}',
          onTap: () {},
          onSecondaryTap: (_, __) {},
          focusNode: focusNode,
        ),
      ));
      focusNode.requestFocus();
      await tester.pump();

      // The AnimatedContainer should have a border when focused.
      final container = tester.widget<AnimatedContainer>(
        find.byType(AnimatedContainer),
      );
      final decoration = container.decoration as BoxDecoration?;
      expect(decoration?.border, isNotNull);
      focusNode.dispose();
    });
  });

  group('EmojiGrid', () {
    testWidgets('renders correct number of emoji buttons', (tester) async {
      final emojis = ['\u{1F600}', '\u{1F601}', '\u{1F602}'];
      await tester.pumpWidget(_buildTestApp(
        child: SizedBox(
          width: 400,
          height: 400,
          child: EmojiGrid(
            emojis: emojis,
            onEmojiTap: (_) {},
            onEmojiSecondaryTap: (_, __) {},
          ),
        ),
      ));
      expect(find.byType(EmojiButton), findsNWidgets(3));
    });

    testWidgets('renders empty when no emojis', (tester) async {
      await tester.pumpWidget(_buildTestApp(
        child: SizedBox(
          width: 400,
          height: 400,
          child: EmojiGrid(
            emojis: const [],
            onEmojiTap: (_) {},
            onEmojiSecondaryTap: (_, __) {},
          ),
        ),
      ));
      expect(find.byType(EmojiButton), findsNothing);
    });
  });

  group('CategorySection', () {
    testWidgets('shows category name and count', (tester) async {
      final emojis = ['\u{1F600}', '\u{1F601}'];
      await tester.pumpWidget(_buildTestApp(
        child: SizedBox(
          width: 400,
          height: 400,
          child: CategorySection(
            categoryName: 'Smileys',
            emojis: emojis,
            onEmojiTap: (_) {},
            onEmojiSecondaryTap: (_, __) {},
          ),
        ),
      ));
      expect(find.text('Smileys (2)'), findsOneWidget);
      expect(find.byType(EmojiButton), findsNWidgets(2));
    });

    testWidgets('renders nothing when emojis list is empty', (tester) async {
      await tester.pumpWidget(_buildTestApp(
        child: CategorySection(
          categoryName: 'Empty',
          emojis: const [],
          onEmojiTap: (_) {},
          onEmojiSecondaryTap: (_, __) {},
        ),
      ));
      expect(find.text('Empty (0)'), findsNothing);
      expect(find.byType(EmojiButton), findsNothing);
    });
  });

  group('CategoryDropdown', () {
    testWidgets('shows selected category', (tester) async {
      await tester.pumpWidget(_buildTestApp(
        child: CategoryDropdown(
          selectedCategory: 'all',
          options: const ['all', 'Smileys', 'Animals'],
          onChanged: (_) {},
        ),
      ));
      expect(find.text('All categories'), findsOneWidget);
    });

    testWidgets('calls onChanged when value selected', (tester) async {
      String? selected;
      await tester.pumpWidget(_buildTestApp(
        child: CategoryDropdown(
          selectedCategory: 'all',
          options: const ['all', 'Smileys'],
          onChanged: (v) => selected = v,
        ),
      ));
      // Open the dropdown.
      await tester.tap(find.byType(DropdownButton<String>));
      await tester.pumpAndSettle();
      // Select "Smileys".
      await tester.tap(find.text('Smileys').last);
      await tester.pumpAndSettle();
      expect(selected, 'Smileys');
    });

    testWidgets('falls back to all if selected category not in options',
        (tester) async {
      await tester.pumpWidget(_buildTestApp(
        child: CategoryDropdown(
          selectedCategory: 'NonExistent',
          options: const ['all', 'Smileys'],
          onChanged: (_) {},
        ),
      ));
      // Should display "All categories" as fallback.
      expect(find.text('All categories'), findsOneWidget);
    });
  });

  group('EmojiSearchBar', () {
    testWidgets('renders with placeholder', (tester) async {
      await tester.pumpWidget(_buildTestApp(
        child: Row(
          children: [
            EmojiSearchBar(
              controller: TextEditingController(),
              onChanged: (_) {},
            ),
          ],
        ),
      ));
      expect(find.byType(TextField), findsOneWidget);
    });

    testWidgets('calls onChanged when text entered', (tester) async {
      String? query;
      final controller = TextEditingController();
      await tester.pumpWidget(_buildTestApp(
        child: Row(
          children: [
            EmojiSearchBar(
              controller: controller,
              onChanged: (v) => query = v,
            ),
          ],
        ),
      ));
      await tester.enterText(find.byType(TextField), 'smile');
      expect(query, 'smile');
    });
  });

  group('HiddenSection', () {
    testWidgets('renders as collapsed ExpansionTile', (tester) async {
      await tester.pumpWidget(_buildTestApp(
        child: SizedBox(
          width: 400,
          height: 400,
          child: SingleChildScrollView(
            child: HiddenSection(
              hiddenEmojis: const ['\u{1F600}', '\u{1F601}'],
              onEmojiTap: (_) {},
              onEmojiSecondaryTap: (_, __) {},
            ),
          ),
        ),
      ));
      expect(find.text('Hidden (2)'), findsOneWidget);
      // Initially collapsed — emoji buttons not visible.
      expect(find.byType(EmojiButton), findsNothing);
    });

    testWidgets('expands to show emojis on tap', (tester) async {
      await tester.pumpWidget(_buildTestApp(
        child: SizedBox(
          width: 400,
          height: 400,
          child: SingleChildScrollView(
            child: HiddenSection(
              hiddenEmojis: const ['\u{1F600}'],
              onEmojiTap: (_) {},
              onEmojiSecondaryTap: (_, __) {},
            ),
          ),
        ),
      ));
      await tester.tap(find.text('Hidden (1)'));
      await tester.pumpAndSettle();
      expect(find.byType(EmojiButton), findsOneWidget);
    });

    testWidgets('renders nothing when empty', (tester) async {
      await tester.pumpWidget(_buildTestApp(
        child: HiddenSection(
          hiddenEmojis: const [],
          onEmojiTap: (_) {},
          onEmojiSecondaryTap: (_, __) {},
        ),
      ));
      expect(find.byType(ExpansionTile), findsNothing);
    });
  });
}
