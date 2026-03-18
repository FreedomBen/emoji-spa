import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:emoji_spa/state/theme_state.dart';
import 'package:emoji_spa/theme.dart';
import 'package:emoji_spa/widgets/home_page.dart';

class EmojiSpaApp extends StatelessWidget {
  const EmojiSpaApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeState = context.watch<ThemeState>();

    return MaterialApp(
      title: 'Emoji Spa',
      debugShowCheckedModeBanner: false,
      theme: buildLightTheme(),
      darkTheme: buildDarkTheme(),
      themeMode: themeState.themeMode,
      home: const HomePage(),
    );
  }
}
