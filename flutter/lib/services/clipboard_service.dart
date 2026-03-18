import 'package:flutter/services.dart';

class ClipboardService {
  /// Copies [text] to the system clipboard.
  /// Returns true on success, false on failure.
  Future<bool> copy(String text) async {
    try {
      await Clipboard.setData(ClipboardData(text: text));
      return true;
    } catch (_) {
      return false;
    }
  }
}
