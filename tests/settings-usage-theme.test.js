import { describe, it, expect, beforeEach, vi } from "vitest";
import * as app from "../frontend/app.js";
import { resetAppState } from "./test-utils.js";

const {
  emojiUsage,
  metadataByEmoji,
  hiddenEmojis,
  pinnedEmojis,
  searchState,
  setAllCategoriesForTest,
  getEmojiUsageRows,
  renderEmojiUsageTable,
  getFrequentEmojis,
  getRecentEmojis,
  openSettingsPanel,
  closeSettingsPanel,
  applyFiltersAndRender,
  loadThemePreference,
  applyTheme,
  syncThemeControlsFromPreference,
  handleSystemThemeChange,
  THEME_SYSTEM,
  THEME_LIGHT,
  THEME_DARK,
  THEME_STORAGE_KEY,
  initControls
} = app;

describe("settings panel – usage history", () => {
  beforeEach(() => {
    resetAppState();
  });

  it("renders emoji usage table with one row per emoji and correct sorting", () => {
    setAllCategoriesForTest(
      new Map([
        ["Animals & Nature", ["🐶"]],
        ["Food & Drink", ["🍕", "🍎"]]
      ])
    );

    emojiUsage.set("🐶", { count: 5, lastUsed: 300 });
    emojiUsage.set("🍕", { count: 3, lastUsed: 200 });
    // 🍎 intentionally has no usage stats (should show count 0).
    emojiUsage.set("🚀", { count: 1, lastUsed: 400 });

    renderEmojiUsageTable();

    const rows = Array.from(
      document.querySelectorAll("#emojiUsageTableBody tr")
    );
    expect(rows.length).toBe(4);

    const cells = rows.map((row) =>
      Array.from(row.querySelectorAll("td")).map((td) => td.textContent)
    );

    const emojis = cells.map((row) => row[0]);
    expect(emojis).toEqual(["🐶", "🍕", "🚀", "🍎"]);

    const dogMeta = metadataByEmoji.get("🐶");
    expect(cells[0][1]).toBe(dogMeta.name);
    expect(cells[0][2]).toBe("Animals & Nature");
    expect(cells[0][3]).toBe("5");

    const appleRow = cells.find((row) => row[0] === "🍎");
    expect(appleRow[3]).toBe("0");
  });

  it("renders empty-state row when there is no usage data", () => {
    setAllCategoriesForTest(
      new Map([["Food & Drink", ["🍕"]]])
    );

    emojiUsage.clear();
    renderEmojiUsageTable();

    const rows = Array.from(
      document.querySelectorAll("#emojiUsageTableBody tr")
    );
    expect(rows.length).toBe(1);

    const cell = rows[0].querySelector("td");
    expect(cell).toBeTruthy();
    expect(cell.colSpan).toBe(4);
    expect(cell.textContent).toBe("No emoji usage recorded yet.");
  });

  it("reset-all-usage button clears usage and refreshes dependent views when confirmed", () => {
    setAllCategoriesForTest(
      new Map([["Smileys & Emotion", ["😀", "😂"]]])
    );

    emojiUsage.set("😀", { count: 3, lastUsed: 100 });
    emojiUsage.set("😂", { count: 2, lastUsed: 200 });

    initControls();
    renderEmojiUsageTable();

    const resetButton = document.getElementById("resetAllUsageButton");
    expect(resetButton).toBeTruthy();

    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);

    try {
      resetButton.click();
    } finally {
      window.confirm = originalConfirm;
    }

    expect(emojiUsage.size).toBe(0);
    expect(getFrequentEmojis()).toEqual([]);
    expect(getRecentEmojis()).toEqual([]);

    const rows = Array.from(
      document.querySelectorAll("#emojiUsageTableBody tr")
    );
    expect(rows.length).toBe(1);
    const cell = rows[0].querySelector("td");
    expect(cell.textContent).toBe("No emoji usage recorded yet.");
  });

  it("reset-all-usage button leaves data unchanged when user cancels", () => {
    setAllCategoriesForTest(
      new Map([["Smileys & Emotion", ["😀"]]])
    );

    emojiUsage.set("😀", { count: 3, lastUsed: 100 });

    initControls();
    renderEmojiUsageTable();

    const resetButton = document.getElementById("resetAllUsageButton");
    expect(resetButton).toBeTruthy();

    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(false);

    try {
      resetButton.click();
    } finally {
      window.confirm = originalConfirm;
    }

    expect(emojiUsage.size).toBe(1);
    const rows = Array.from(
      document.querySelectorAll("#emojiUsageTableBody tr")
    );
    expect(rows.length).toBe(1);
    const cell = rows[0].querySelector("td:last-child");
    expect(cell.textContent).toBe("3");
  });
});

describe("settings panel – theme preference UI", () => {
  beforeEach(() => {
    resetAppState();
  });

  it("selects the correct theme radio based on stored preference", () => {
    const radios = document.querySelectorAll('input[name="themePreference"]');
    expect(radios.length).toBe(3);

    window.localStorage.setItem(THEME_STORAGE_KEY, THEME_DARK);
    applyTheme(loadThemePreference(), false);
    openSettingsPanel();

    let darkRadio = document.querySelector(
      'input[name="themePreference"][value="dark"]'
    );
    let systemRadio = document.querySelector(
      'input[name="themePreference"][value="system"]'
    );
    let lightRadio = document.querySelector(
      'input[name="themePreference"][value="light"]'
    );

    expect(darkRadio.checked).toBe(true);
    expect(systemRadio.checked).toBe(false);
    expect(lightRadio.checked).toBe(false);

    window.localStorage.setItem(THEME_STORAGE_KEY, THEME_LIGHT);
    applyTheme(loadThemePreference(), false);
    openSettingsPanel();

    darkRadio = document.querySelector(
      'input[name="themePreference"][value="dark"]'
    );
    systemRadio = document.querySelector(
      'input[name="themePreference"][value="system"]'
    );
    lightRadio = document.querySelector(
      'input[name="themePreference"][value="light"]'
    );

    expect(lightRadio.checked).toBe(true);
    expect(systemRadio.checked).toBe(false);
    expect(darkRadio.checked).toBe(false);
  });

  it("changing theme radio applies theme and persists new preference", () => {
    initControls();

    window.localStorage.setItem(THEME_STORAGE_KEY, THEME_SYSTEM);
    applyTheme(loadThemePreference(), true);
    openSettingsPanel();

    const lightRadio = document.querySelector(
      'input[name="themePreference"][value="light"]'
    );
    expect(lightRadio).toBeTruthy();

    lightRadio.checked = true;
    lightRadio.dispatchEvent(new Event("change", { bubbles: true }));

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    expect(stored).toBe(THEME_LIGHT);

    const body = document.body;
    expect(body.getAttribute("data-theme")).toBe("light");
  });

  it("system theme preference follows OS theme via matchMedia while keeping stored preference as system", () => {
    let isDark = false;

    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: isDark,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {}
    }));

    window.localStorage.setItem(THEME_STORAGE_KEY, THEME_SYSTEM);
    applyTheme(loadThemePreference(), true);

    const body = document.body;
    expect(body.getAttribute("data-theme")).toBe("light");

    isDark = true;
    handleSystemThemeChange();
    expect(body.getAttribute("data-theme")).toBe("dark");

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    expect(stored).toBe(THEME_SYSTEM);
  });
});

describe("settings panel – open/close behavior", () => {
  beforeEach(() => {
    resetAppState();
    initControls();
    // Ensure the panel starts closed (prior tests may have left it open).
    closeSettingsPanel();
  });

  it("opening settings panel removes hidden class and sets aria-hidden to false", () => {
    const overlay = document.getElementById("settingsOverlay");
    expect(overlay.classList.contains("settings-hidden")).toBe(true);
    expect(overlay.getAttribute("aria-hidden")).toBe("true");

    openSettingsPanel();

    expect(overlay.classList.contains("settings-hidden")).toBe(false);
    expect(overlay.getAttribute("aria-hidden")).toBe("false");
  });

  it("close button restores hidden state", () => {
    openSettingsPanel();

    const overlay = document.getElementById("settingsOverlay");
    const closeButton = document.getElementById("closeSettingsButton");
    closeButton.click();

    expect(overlay.classList.contains("settings-hidden")).toBe(true);
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
  });

  it("clicking overlay backdrop closes the panel", () => {
    openSettingsPanel();

    const overlay = document.getElementById("settingsOverlay");

    // Simulate clicking the overlay itself (not the inner panel).
    const clickEvent = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(clickEvent, "target", { value: overlay });
    overlay.dispatchEvent(clickEvent);

    expect(overlay.classList.contains("settings-hidden")).toBe(true);
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
  });

  it("clicking inside the panel does not close it", () => {
    openSettingsPanel();

    const overlay = document.getElementById("settingsOverlay");
    const panel = overlay.querySelector(".settings-panel");

    // Simulate clicking inside the panel — target is the panel, not the overlay.
    const clickEvent = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(clickEvent, "target", { value: panel });
    overlay.dispatchEvent(clickEvent);

    expect(overlay.classList.contains("settings-hidden")).toBe(false);
    expect(overlay.getAttribute("aria-hidden")).toBe("false");
  });

  it("Escape key closes the settings panel", () => {
    openSettingsPanel();

    const overlay = document.getElementById("settingsOverlay");

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );

    expect(overlay.classList.contains("settings-hidden")).toBe(true);
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
  });

  it("closing settings panel does not affect search or category state", () => {
    setAllCategoriesForTest(
      new Map([
        ["Animals & Nature", ["🐶"]],
        ["Food & Drink", ["🍕"]]
      ])
    );

    searchState.query = "dog";
    searchState.category = "Animals & Nature";
    pinnedEmojis.add("🐶");
    hiddenEmojis.add("🍕");
    emojiUsage.set("🐶", { count: 3, lastUsed: 100 });

    openSettingsPanel();
    closeSettingsPanel();

    expect(searchState.query).toBe("dog");
    expect(searchState.category).toBe("Animals & Nature");
    expect(pinnedEmojis.has("🐶")).toBe(true);
    expect(hiddenEmojis.has("🍕")).toBe(true);
    expect(emojiUsage.get("🐶").count).toBe(3);
  });
});

describe("theme toggle does not reset UI state", () => {
  beforeEach(() => {
    resetAppState();
    initControls();
  });

  it("toggling theme preserves category, search, pinned, hidden, and usage state", () => {
    const categories = new Map([
      ["Animals & Nature", ["🐶", "🐱"]],
      ["Food & Drink", ["🍕"]]
    ]);
    setAllCategoriesForTest(categories);

    // Set up diverse UI state.
    pinnedEmojis.add("🐶");
    hiddenEmojis.add("🍕");
    emojiUsage.set("🐶", { count: 5, lastUsed: 200 });
    emojiUsage.set("🐱", { count: 2, lastUsed: 100 });
    searchState.groupByCategory = false;

    // First render to populate the category select with real options.
    applyFiltersAndRender();

    // Now set the category via the select element so it sticks across re-renders.
    const categorySelect = document.getElementById("categorySelect");
    categorySelect.value = "Animals & Nature";
    searchState.category = "Animals & Nature";

    // Set a search query via the input element.
    const searchInput = document.getElementById("searchInput");
    searchInput.value = "cat";
    searchState.query = "cat";

    // Re-render with the active filters.
    applyFiltersAndRender();

    // Snapshot state before theme toggles.
    const categoriesEl = document.getElementById("categories");
    const htmlBefore = categoriesEl.innerHTML;

    // Toggle to light theme.
    applyTheme(THEME_LIGHT);

    // All state should be unchanged.
    expect(searchState.query).toBe("cat");
    expect(searchState.category).toBe("Animals & Nature");
    expect(searchState.groupByCategory).toBe(false);
    expect(pinnedEmojis.has("🐶")).toBe(true);
    expect(hiddenEmojis.has("🍕")).toBe(true);
    expect(emojiUsage.get("🐶").count).toBe(5);
    expect(emojiUsage.get("🐱").count).toBe(2);

    // Toggle to dark theme.
    applyTheme(THEME_DARK);

    expect(searchState.query).toBe("cat");
    expect(searchState.category).toBe("Animals & Nature");
    expect(pinnedEmojis.has("🐶")).toBe(true);
    expect(hiddenEmojis.has("🍕")).toBe(true);

    // The DOM body should reflect the theme but the emoji grid should be identical.
    expect(document.body.getAttribute("data-theme")).toBe("dark");
    expect(categoriesEl.innerHTML).toBe(htmlBefore);
  });
});
