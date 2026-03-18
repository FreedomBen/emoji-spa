import 'package:flutter/material.dart';

class EmojiSpaApp extends StatelessWidget {
  const EmojiSpaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Emoji Spa',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.light(),
      darkTheme: ThemeData.dark(),
      themeMode: ThemeMode.system,
      home: const Scaffold(
        body: Center(
          child: Text('Emoji Spa — loading...'),
        ),
      ),
    );
  }
}
