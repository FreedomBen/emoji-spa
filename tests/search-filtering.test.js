import { describe, it, expect, beforeEach } from "vitest";
import {
  CATEGORY_KEYWORDS,
  metadataByEmoji,
  emojiUsage,
  pinnedEmojis,
  hiddenEmojis,
  searchState,
  filterCategories,
  computeCategorySelectOptions,
  applyFiltersAndRender,
  setAllCategoriesForTest,
  getFrequentEmojis,
  getRecentEmojis,
  initControls
} from "../dist/app.js";
import { resetAppState } from "./test-utils.js";

const BASE_CATEGORIES = new Map([
  ["Animals & Nature", ["🐶", "🐱"]],
  ["Food & Drink", ["🍕"]],
  ["Travel & Places", ["🚀"]],
  ["Smileys & Emotion", ["😀", "😂", "❤️"]]
]);

describe("search and filtering", () => {
  beforeEach(() => {
    resetAppState();
    setAllCategoriesForTest(new Map(BASE_CATEGORIES));
    initControls();
    // Initial render to populate the category dropdown based on base categories.
    applyFiltersAndRender();
  });

  it("matches by category name, emoji name, and keywords", () => {
    // Search by category name ("animals" -> Animals & Nature).
    searchState.query = "animals";
    searchState.category = "all";
    let result = filterCategories();
    expect(Array.from(result.keys())).toEqual(["Animals & Nature"]);

    // Search by emoji name ("heart" -> includes ❤️).
    searchState.query = "heart";
    searchState.category = "all";
    result = filterCategories();
    const allMatches = Array.from(result.values()).flat();
    expect(allMatches).toContain("❤️");

    // Search by keyword ("pizza" -> Food & Drink / 🍕).
    searchState.query = "pizza";
    result = filterCategories();
    expect(Array.from(result.keys())).toEqual(["Food & Drink"]);
    expect(Array.from(result.values()).flat()).toEqual(["🍕"]);

    // Multi-word search ("red heart" -> ❤️).
    searchState.query = "red heart";
    result = filterCategories();
    expect(Array.from(result.values()).flat()).toContain("❤️");

    // Non-matching token yields empty result.
    searchState.query = "nonexistent-token";
    result = filterCategories();
    expect(result.size).toBe(0);
  });

  it("computes category dropdown options in the expected order without special sections", () => {
    const { items, selectedValue } = computeCategorySelectOptions(
      new Map(BASE_CATEGORIES),
      "all"
    );

    const values = items.map((item) => item.value);
    expect(values).toEqual([
      "all",
      "Animals & Nature",
      "Food & Drink",
      "Smileys & Emotion",
      "Travel & Places"
    ]);
    expect(selectedValue).toBe("all");
  });

  it("includes special sections (Pinned, Frequently Used, Recently Used, Hidden) in dropdown when present", () => {
    pinnedEmojis.add("😀");

    const now = Date.now();
    emojiUsage.set("😀", { count: 5, lastUsed: now });
    emojiUsage.set("😂", { count: 3, lastUsed: now - 10 });
    emojiUsage.set("🍕", { count: 2, lastUsed: now - 20 });

    hiddenEmojis.add("🐱");

    // Sanity check for frequent/recent helpers.
    expect(getFrequentEmojis().length).toBeGreaterThan(0);
    expect(getRecentEmojis().length).toBeGreaterThan(0);

    const { items, selectedValue } = computeCategorySelectOptions(
      new Map(BASE_CATEGORIES),
      "Food & Drink"
    );

    const values = items.map((item) => item.value);
    expect(values).toEqual([
      "all",
      "Pinned",
      "Frequently Used",
      "Recently Used",
      "Animals & Nature",
      "Food & Drink",
      "Smileys & Emotion",
      "Travel & Places",
      "Hidden"
    ]);
    expect(selectedValue).toBe("Food & Drink");
  });

  it("shows only the Pinned section when category filter is set to Pinned", () => {
    pinnedEmojis.add("😀");
    pinnedEmojis.add("🍕");

    const categoriesEl = document.getElementById("categories");
    expect(categoriesEl).toBeTruthy();

    // Re-render to ensure dropdown options include "Pinned".
    applyFiltersAndRender();

    const categorySelect = document.getElementById("categorySelect");
    categorySelect.value = "Pinned";
    categorySelect.dispatchEvent(new Event("change", { bubbles: true }));

    const headings = Array.from(
      categoriesEl.querySelectorAll("section > h2")
    ).map((h) => h.textContent);

    expect(headings.length).toBe(1);
    expect(headings[0]).toMatch(/^Pinned \(\d+\)$/);

    const pinnedButtons = Array.from(
      categoriesEl.querySelectorAll("section button.emoji-button")
    ).map((btn) => btn.textContent);
    expect(new Set(pinnedButtons)).toEqual(new Set(["😀", "🍕"]));
  });

  it("shows only the Hidden section when category filter is set to Hidden", () => {
    hiddenEmojis.add("😀");
    hiddenEmojis.add("🍕");

    const categoriesEl = document.getElementById("categories");
    expect(categoriesEl).toBeTruthy();

    // Re-render so that the dropdown options include "Hidden".
    applyFiltersAndRender();

    const categorySelect = document.getElementById("categorySelect");
    categorySelect.value = "Hidden";
    categorySelect.dispatchEvent(new Event("change", { bubbles: true }));

    const sections = Array.from(
      categoriesEl.querySelectorAll("section")
    );
    expect(sections.length).toBe(1);

    const summary = sections[0].querySelector("summary");
    expect(summary).toBeTruthy();
    expect(summary.textContent).toMatch(/^Hidden \(\d+\)$/);

    const hiddenButtons = Array.from(
      sections[0].querySelectorAll("button.emoji-button")
    ).map((btn) => btn.textContent);
    expect(new Set(hiddenButtons)).toEqual(new Set(["😀", "🍕"]));
  });

  it("shows only the Frequently Used section when category filter is set to Frequently Used", () => {
    const categoriesEl = document.getElementById("categories");
    expect(categoriesEl).toBeTruthy();

    const now = Date.now();
    emojiUsage.set("😀", { count: 5, lastUsed: now });
    emojiUsage.set("🍕", { count: 3, lastUsed: now - 10 });
    emojiUsage.set("🐱", { count: 1, lastUsed: now - 20 });

    // Re-render so that the dropdown options include "Frequently Used".
    applyFiltersAndRender();

    const categorySelect = document.getElementById("categorySelect");
    categorySelect.value = "Frequently Used";
    categorySelect.dispatchEvent(new Event("change", { bubbles: true }));

    const headings = Array.from(
      categoriesEl.querySelectorAll("section > h2")
    ).map((h) => h.textContent);

    expect(headings.length).toBe(1);
    expect(headings[0]).toMatch(/^Frequently Used \(\d+\)$/);

    const buttons = Array.from(
      categoriesEl.querySelectorAll("section button.emoji-button")
    ).map((btn) => btn.textContent);

    // With FREQUENT_MIN_COUNT = 2, only 😀 and 🍕 qualify.
    expect(new Set(buttons)).toEqual(new Set(["😀", "🍕"]));
  });

  it("shows only the Recently Used section when category filter is set to Recently Used", () => {
    const categoriesEl = document.getElementById("categories");
    expect(categoriesEl).toBeTruthy();

    const now = Date.now();
    emojiUsage.set("😀", { count: 1, lastUsed: now - 30 });
    emojiUsage.set("🍕", { count: 1, lastUsed: now - 10 });
    emojiUsage.set("🐱", { count: 1, lastUsed: now - 20 });

    // Re-render so that the dropdown options include "Recently Used".
    applyFiltersAndRender();

    const categorySelect = document.getElementById("categorySelect");
    categorySelect.value = "Recently Used";
    categorySelect.dispatchEvent(new Event("change", { bubbles: true }));

    const headings = Array.from(
      categoriesEl.querySelectorAll("section > h2")
    ).map((h) => h.textContent);

    expect(headings.length).toBe(1);
    expect(headings[0]).toMatch(/^Recently Used \(\d+\)$/);

    const buttons = Array.from(
      categoriesEl.querySelectorAll("section button.emoji-button")
    ).map((btn) => btn.textContent);

    expect(new Set(buttons)).toEqual(new Set(["😀", "🍕", "🐱"]));
  });

  it("applies search tokens within special modes without rendering base categories", () => {
    const categoriesEl = document.getElementById("categories");
    expect(categoriesEl).toBeTruthy();

    const now = Date.now();
    // Ensure frequently-used set includes both 😀 and 🍕.
    emojiUsage.set("😀", { count: 5, lastUsed: now });
    emojiUsage.set("🍕", { count: 3, lastUsed: now - 10 });

    searchState.query = "pizza";

    // Re-render so that the dropdown options include "Frequently Used".
    applyFiltersAndRender();

    const categorySelect = document.getElementById("categorySelect");
    categorySelect.value = "Frequently Used";
    categorySelect.dispatchEvent(new Event("change", { bubbles: true }));

    const headings = Array.from(
      categoriesEl.querySelectorAll("section > h2")
    ).map((h) => h.textContent);

    expect(headings.length).toBe(1);
    expect(headings[0]).toMatch(/^Frequently Used \(\d+\)$/);

    const buttons = Array.from(
      categoriesEl.querySelectorAll("section button.emoji-button")
    ).map((btn) => btn.textContent);

    // Only 🍕 should match "pizza" via keywords; 😀 should be filtered out.
    expect(buttons).toEqual(["🍕"]);
  });

  it("does not change underlying base category options when switching into and out of special modes", () => {
    const baseCategories = new Map(BASE_CATEGORIES);

    // Start from base view.
    searchState.category = "all";
    let { items, selectedValue } = computeCategorySelectOptions(
      baseCategories,
      "all"
    );
    expect(selectedValue).toBe("all");

    // Add some usage so special modes become available.
    const now = Date.now();
    emojiUsage.set("😀", { count: 5, lastUsed: now });

    // Switch to a special category.
    searchState.category = "Frequently Used";
    ({ items, selectedValue } = computeCategorySelectOptions(
      baseCategories,
      searchState.category
    ));

    const valuesWithSpecials = items.map((item) => item.value);
    expect(valuesWithSpecials).toContain("Frequently Used");

    // Now pretend the user switches back to a base category.
    searchState.category = "Animals & Nature";
    ({ items, selectedValue } = computeCategorySelectOptions(
      baseCategories,
      searchState.category
    ));

    const valuesBase = items.map((item) => item.value);
    expect(valuesBase).toContain("Animals & Nature");
    expect(selectedValue).toBe("Animals & Nature");
  });
});
