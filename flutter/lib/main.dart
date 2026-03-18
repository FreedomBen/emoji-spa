import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:emoji_spa/app.dart';
import 'package:emoji_spa/services/storage_service.dart';
import 'package:emoji_spa/state/emoji_state.dart';
import 'package:emoji_spa/state/theme_state.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
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
