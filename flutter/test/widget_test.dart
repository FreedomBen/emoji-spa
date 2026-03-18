import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:emoji_spa/app.dart';
import 'package:emoji_spa/services/storage_service.dart';
import 'package:emoji_spa/state/emoji_state.dart';
import 'package:emoji_spa/state/theme_state.dart';

void main() {
  testWidgets('App renders without error', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    final storage = StorageService();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(
              create: (_) => ThemeState(storage)..initialize()),
          ChangeNotifierProvider(
              create: (_) => EmojiAppState(storage)..initialize()),
        ],
        child: const EmojiSpaApp(),
      ),
    );

    // Initially shows loading indicator while state initializes.
    expect(find.byType(EmojiSpaApp), findsOneWidget);
  });
}
