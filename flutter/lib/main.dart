import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:window_manager/window_manager.dart';

import 'package:emoji_spa/app.dart';
import 'package:emoji_spa/services/storage_service.dart';
import 'package:emoji_spa/state/emoji_state.dart';
import 'package:emoji_spa/state/theme_state.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Linux desktop window configuration.
  if (!kIsWeb && Platform.isLinux) {
    await windowManager.ensureInitialized();
    const windowOptions = WindowOptions(
      size: Size(1000, 800),
      title: 'Emoji Spa',
      center: true,
    );
    await windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }

  final storage = StorageService();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeState(storage)..initialize()),
        ChangeNotifierProvider(
            create: (_) => EmojiAppState(storage)..initialize()),
      ],
      child: const EmojiSpaApp(),
    ),
  );
}
