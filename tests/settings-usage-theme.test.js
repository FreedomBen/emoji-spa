import { describe, it, expect, beforeEach, vi } from "vitest";
import * as app from "../dist/app.js";
import { resetAppState } from "./test-utils.js";

const {
  emojiUsage,
  metadataByEmoji,
  hiddenEmojis,
  searchState,
  setAllCategoriesForTest,
  getEmojiUsageRows,
  renderEmojiUsageTable,
  getFrequentEmojis,
  getRecentEmojis,
  openSettingsPanel,
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
}
);
