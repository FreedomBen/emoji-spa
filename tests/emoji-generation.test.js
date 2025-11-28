import { describe, it, expect, beforeEach } from "vitest";
import {
  initEmojiRegex,
  resetEmojiRegexForTest,
  isEmoji,
  getCategory,
  generateEmojiByCategoryForTest
} from "../frontend/app.js";
import { resetAppState } from "./test-utils.js";

describe("emoji detection and categorization", () => {
  beforeEach(() => {
    resetAppState();
    resetEmojiRegexForTest();
  });

  it("detects emoji using fallback heuristic when regex is not initialized", () => {
    const emojis = ["😀", "😂", "❤️", "🚀"];
    const nonEmojis = ["A", "1", "?", "中"];

    for (const ch of emojis) {
      expect(isEmoji(ch)).toBe(true);
    }
    for (const ch of nonEmojis) {
      expect(isEmoji(ch)).toBe(false);
    }
  });

  it("detects emoji when Unicode property escapes are available", () => {
    initEmojiRegex();

    const emojis = ["😀", "😂", "❤️", "🚀"];
    const nonEmojis = ["A", "1", "?", "中"];

    for (const ch of emojis) {
      expect(isEmoji(ch)).toBe(true);
    }
    for (const ch of nonEmojis) {
      expect(isEmoji(ch)).toBe(false);
    }
  });

  it("maps representative code points to expected categories", () => {
    const cases = [
      { char: "😀", expected: "Smileys & Emotion" },
      { char: "🐶", expected: "Animals & Nature" },
      { char: "🍕", expected: "Food & Drink" },
      { char: "🚗", expected: "Transport & Map" },
      { char: "❤️", expected: "Dingbats" },
      { char: "🇺🇸", expected: "Regional Indicators" }
    ];

    const knownCategories = new Set([
      "Smileys & Emotion",
      "People & Body",
      "Animals & Nature",
      "Food & Drink",
      "Travel & Places",
      "Transport & Map",
      "Alchemical Symbols",
      "Geometric Symbols",
      "Supplemental Arrows",
      "Supplemental Symbols & Pictographs",
      "Symbols & Pictographs Extended-A",
      "Misc Symbols",
      "Dingbats",
      "Regional Indicators",
      "Other Emoji"
    ]);

    for (const { char, expected } of cases) {
      const cp = char.codePointAt(0);
      const category = getCategory(cp);
      expect(category).toBe(expected);
      expect(knownCategories.has(category)).toBe(true);
    }
  });

  it("generateEmojiByCategoryForTest returns sorted, deduplicated categories", () => {
    const isEmojiMock = (ch) => ch === "A" || ch === "B" || ch === "C";
    const getCategoryMock = (cp) => {
      if (cp === "A".codePointAt(0)) return "Category Z";
      if (cp === "B".codePointAt(0)) return "Category A";
      if (cp === "C".codePointAt(0)) return "Category A";
      return "Other";
    };

    const categories = generateEmojiByCategoryForTest(
      "C".codePointAt(0),
      isEmojiMock,
      getCategoryMock
    );

    const names = Array.from(categories.keys());
    expect(names).toEqual(["Category A", "Category Z"]);

    const aList = categories.get("Category A");
    const zList = categories.get("Category Z");

    expect(aList).toEqual(["B", "C"]);
    expect(zList).toEqual(["A"]);
  });
}
);

