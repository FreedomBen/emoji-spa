import 'package:flutter_test/flutter_test.dart';

import 'package:emoji_spa/app.dart';

void main() {
  testWidgets('App renders without error', (WidgetTester tester) async {
    await tester.pumpWidget(const EmojiSpaApp());
    expect(find.text('Emoji Spa — loading...'), findsOneWidget);
  });
}
