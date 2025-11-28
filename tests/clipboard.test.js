import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  emojiUsage,
  copyEmoji
} from "../frontend/app.js";
import { resetAppState } from "./test-utils.js";

describe("clipboard handling", () => {
  beforeEach(() => {
    resetAppState();
  });

  it("uses fallback path when navigator.clipboard is unavailable", async () => {
    const originalClipboard = navigator.clipboard;

    try {
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        configurable: true
      });
    } catch {
      // If we cannot redefine, just assign directly.
      // eslint-disable-next-line no-global-assign
      navigator.clipboard = undefined;
    }

    const execSpy = vi
      .spyOn(document, "execCommand")
      .mockImplementation(() => true);

    const emoji = "😀";
    await copyEmoji(emoji);

    const usage = emojiUsage.get(emoji);
    expect(usage).toBeTruthy();
    expect(usage.count).toBe(1);

    expect(execSpy).toHaveBeenCalledWith("copy");

    const textareas = document.querySelectorAll("textarea");
    expect(textareas.length).toBe(0);

    execSpy.mockRestore();

    if (originalClipboard !== undefined) {
      try {
        Object.defineProperty(navigator, "clipboard", {
          value: originalClipboard,
          configurable: true
        });
      } catch {
        // best-effort restore
        // eslint-disable-next-line no-global-assign
        navigator.clipboard = originalClipboard;
      }
    }
  });

  it("uses primary clipboard API when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = navigator.clipboard;

    try {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true
      });
    } catch {
      // eslint-disable-next-line no-global-assign
      navigator.clipboard = { writeText };
    }

    const execSpy = vi
      .spyOn(document, "execCommand")
      .mockImplementation(() => {
        throw new Error("execCommand should not be called when clipboard API is available");
      });

    const emoji = "😀";
    await copyEmoji(emoji);

    expect(writeText).toHaveBeenCalledWith(emoji);
    const usage = emojiUsage.get(emoji);
    expect(usage).toBeTruthy();
    expect(usage.count).toBe(1);

    execSpy.mockRestore();

    if (originalClipboard !== undefined) {
      try {
        Object.defineProperty(navigator, "clipboard", {
          value: originalClipboard,
          configurable: true
        });
      } catch {
        // eslint-disable-next-line no-global-assign
        navigator.clipboard = originalClipboard;
      }
    }
  });
});
