import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { metadataByEmoji, loadCldrEmojiNames } from "../frontend/app.js";
import { resetAppState } from "./test-utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturePath = path.join(__dirname, "fixtures", "emoji-cldr-sample.json");
const cldrFixture = JSON.parse(readFileSync(fixturePath, "utf8"));

describe("base emoji metadata and CLDR merging", () => {
  beforeEach(() => {
    resetAppState();
  });

  it("populates metadataByEmoji from base emoji-data.js", () => {
    const cases = [
      { emoji: "😀", expectedName: "grinning face" },
      { emoji: "❤️", expectedName: "red heart" },
      { emoji: "🐶", expectedName: "dog face" },
      { emoji: "🍕", expectedName: "pizza" },
      { emoji: "🚗", expectedName: "automobile" }
    ];

    for (const { emoji, expectedName } of cases) {
      const meta = metadataByEmoji.get(emoji);
      expect(meta, `metadata for ${emoji} should exist`).toBeTruthy();
      expect(meta.name).toBe(expectedName);
      expect(Array.isArray(meta.keywords)).toBe(true);
      expect(meta.keywords.length).toBeGreaterThan(0);
    }
  });

  it("merges CLDR data by overriding names and unioning keywords", async () => {
    const originalPizza = metadataByEmoji.get("🍕");
    expect(originalPizza).toBeTruthy();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => cldrFixture
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      await loadCldrEmojiNames();
    } finally {
      globalThis.fetch = originalFetch;
    }

    const updatedGrinning = metadataByEmoji.get("😀");
    expect(updatedGrinning).toBeTruthy();
    expect(updatedGrinning.name).toBe("grinning face (CLDR)");
    expect(new Set(updatedGrinning.keywords)).toEqual(
      new Set(["smile", "happy", "joy", "face", "grinning"])
    );

    const updatedLizard = metadataByEmoji.get("🦎");
    expect(updatedLizard).toBeTruthy();
    expect(updatedLizard.name).toBe("lizard");
    expect(new Set(updatedLizard.keywords)).toEqual(
      new Set(["lizard", "reptile"])
    );

    const updatedPizza = metadataByEmoji.get("🍕");
    expect(updatedPizza).toBeTruthy();
    expect(updatedPizza.name).toBe(originalPizza.name);

    const expectedPizzaKeywords = new Set([
      ...originalPizza.keywords,
      "pizza",
      "slice",
      "cheese"
    ]);
    expect(new Set(updatedPizza.keywords)).toEqual(expectedPizzaKeywords);
  });
});
