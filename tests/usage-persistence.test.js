import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as app from "../frontend/app.js";
import { resetAppState } from "./test-utils.js";

const {
  USAGE_STORAGE_KEY,
  emojiUsage,
  pinnedEmojis,
  hiddenEmojis,
  searchState,
  recordUsage,
  getFrequentEmojis,
  getRecentEmojis,
  resetUsage,
  pinEmoji,
  unpinEmoji,
  hideEmoji,
  unhideEmoji,
  persistUsage,
  loadUsageFromStorage,
  schedulePersistUsage,
  setUsageSectionPreferencesForTest,
  setAllCategoriesForTest,
  getHiddenMatchesForCurrentFilters,
  updateUsageSectionPreference,
  resetUsageSaveTimerForTest,
  flushUsageSaveTimerForTest
} = app;

describe("usage tracking helpers", () => {
  beforeEach(() => {
    resetAppState();
    window.localStorage.clear();
    resetUsageSaveTimerForTest();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetUsageSaveTimerForTest();
  });

  it("recordUsage increments counts and updates lastUsed timestamps", () => {
    vi.useFakeTimers();
    const first = new Date("2024-01-01T00:00:00Z").getTime();
    vi.setSystemTime(first);
    recordUsage("😀");

    expect(emojiUsage.get("😀")).toEqual({ count: 1, lastUsed: first });

    const second = first + 5000;
    vi.setSystemTime(second);
    recordUsage("😀");

    expect(emojiUsage.get("😀")).toEqual({ count: 2, lastUsed: second });
  });

  it("getFrequentEmojis sorts by count, then lastUsed, and falls back to top counts when below threshold", () => {
    emojiUsage.set("😀", { count: 5, lastUsed: 200 });
    emojiUsage.set("🍕", { count: 5, lastUsed: 100 });
    emojiUsage.set("🚀", { count: 1, lastUsed: 300 });

    expect(getFrequentEmojis()).toEqual(["😀", "🍕"]);

    emojiUsage.clear();
    emojiUsage.set("😀", { count: 1, lastUsed: 300 });
    emojiUsage.set("🍕", { count: 1, lastUsed: 200 });
    emojiUsage.set("🚀", { count: 1, lastUsed: 100 });

    expect(getFrequentEmojis()).toEqual(["😀", "🍕", "🚀"]);
  });

  it("getRecentEmojis orders by lastUsed and respects the exclude set", () => {
    emojiUsage.set("😀", { count: 1, lastUsed: 300 });
    emojiUsage.set("🍕", { count: 2, lastUsed: 200 });
    emojiUsage.set("🐱", { count: 3, lastUsed: 0 });
    emojiUsage.set("🚀", { count: 4, lastUsed: 100 });

    const exclude = new Set(["😀"]);
    expect(getRecentEmojis(exclude)).toEqual(["🍕", "🚀"]);
  });

  it("resetUsage removes stats so helpers exclude the emoji afterwards", () => {
    emojiUsage.set("😀", { count: 4, lastUsed: 100 });
    emojiUsage.set("🍕", { count: 1, lastUsed: 50 });

    const scheduleSpy = vi.spyOn(app, "schedulePersistUsage").mockImplementation(() => {});
    resetUsage("😀");
    scheduleSpy.mockRestore();

    expect(emojiUsage.has("😀")).toBe(false);
    expect(getFrequentEmojis()).toEqual(["🍕"]);
    expect(getRecentEmojis()).toEqual(["🍕"]);
  });

  it("pinEmoji/unpinEmoji and hideEmoji/unhideEmoji mutate their sets", () => {
    const scheduleSpy = vi.spyOn(app, "schedulePersistUsage").mockImplementation(() => {});

    pinEmoji("😀");
    expect(pinnedEmojis.has("😀")).toBe(true);
    unpinEmoji("😀");
    expect(pinnedEmojis.has("😀")).toBe(false);

    hideEmoji("🍕");
    expect(hiddenEmojis.has("🍕")).toBe(true);
    unhideEmoji("🍕");
    expect(hiddenEmojis.has("🍕")).toBe(false);

    scheduleSpy.mockRestore();
  });

  it("getHiddenMatchesForCurrentFilters handles pinned and base-category filters", () => {
    setAllCategoriesForTest(
      new Map([
        ["Animals & Nature", ["🐶"]]
      ])
    );

    const scheduleSpy = vi.spyOn(app, "schedulePersistUsage").mockImplementation(() => {});
    hiddenEmojis.add("🐶");
    pinEmoji("🐶");
    scheduleSpy.mockRestore();

    searchState.category = "Pinned";
    expect(getHiddenMatchesForCurrentFilters()).toEqual(["🐶"]);

    searchState.category = "Animals & Nature";
    searchState.query = "dog";
    expect(getHiddenMatchesForCurrentFilters()).toEqual(["🐶"]);
  });
});

describe("usage persistence", () => {
  beforeEach(() => {
    resetAppState();
    window.localStorage.clear();
    setUsageSectionPreferencesForTest({
      showFrequentlyUsed: true,
      showRecentlyUsed: true
    });
    resetUsageSaveTimerForTest();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
    resetUsageSaveTimerForTest();
  });

  it("persistUsage serializes counts, pinned/hidden sets, and preferences", () => {
    emojiUsage.set("😀", { count: 2, lastUsed: 123 });
    pinnedEmojis.add("😀");
    hiddenEmojis.add("🍕");
    searchState.groupByCategory = false;
    setUsageSectionPreferencesForTest({ showFrequentlyUsed: false });

    persistUsage();

    const storedRaw = window.localStorage.getItem(USAGE_STORAGE_KEY);
    expect(storedRaw).toBeTruthy();
    const stored = JSON.parse(storedRaw);

    expect(stored.items["😀"]).toEqual({ count: 2, lastUsed: 123 });
    expect(stored.pinned).toEqual(["😀"]);
    expect(stored.hidden).toEqual(["🍕"]);
    expect(stored.groupByCategory).toBe(false);
    expect(stored.showFrequentlyUsed).toBe(false);
    expect(stored.showRecentlyUsed).toBe(true);
  });

  it("loadUsageFromStorage hydrates usage maps, sets, and checkbox state", () => {
    const payload = {
      version: 1,
      items: {
        "😀": { count: 3, lastUsed: 111 },
        "🍕": { count: 1, lastUsed: 0 }
      },
      pinned: ["😀"],
      hidden: ["🍕"],
      groupByCategory: false,
      showFrequentlyUsed: false,
      showRecentlyUsed: false
    };
    window.localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(payload));

    const checkbox = document.getElementById("groupByCategory");
    expect(checkbox).toBeTruthy();
    checkbox.checked = true;

    loadUsageFromStorage();

    expect(emojiUsage.get("😀")).toEqual({ count: 3, lastUsed: 111 });
    expect(emojiUsage.get("🍕")).toEqual({ count: 1, lastUsed: 0 });
    expect(pinnedEmojis.has("😀")).toBe(true);
    expect(hiddenEmojis.has("🍕")).toBe(true);
    expect(searchState.groupByCategory).toBe(false);
    expect(checkbox.checked).toBe(false);

    const freqStatus = updateUsageSectionPreference("showFrequentlyUsed", false, {
      persist: false,
      rerender: false
    });
    expect(freqStatus).toBe(false);

    const recentStatus = updateUsageSectionPreference("showRecentlyUsed", false, {
      persist: false,
      rerender: false
    });
    expect(recentStatus).toBe(false);
  });

  it("schedulePersistUsage batches writes until the timer fires", () => {
    resetUsageSaveTimerForTest();
    emojiUsage.set("😀", { count: 1, lastUsed: 50 });
    window.localStorage.removeItem(USAGE_STORAGE_KEY);

    schedulePersistUsage();
    schedulePersistUsage();

    expect(window.localStorage.getItem(USAGE_STORAGE_KEY)).toBeNull();

    expect(flushUsageSaveTimerForTest()).toBe(true);
    const stored = window.localStorage.getItem(USAGE_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored);
    expect(parsed.items["😀"]).toEqual({ count: 1, lastUsed: 50 });

    expect(flushUsageSaveTimerForTest()).toBe(false);
  });
});
