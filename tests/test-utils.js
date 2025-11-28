import {
  emojiUsage,
  pinnedEmojis,
  hiddenEmojis,
  searchState,
  setAllCategoriesForTest,
  setUsageSectionPreferencesForTest
} from "../frontend/app.js";

export function resetAppState() {
  setAllCategoriesForTest(null);

  emojiUsage.clear();
  pinnedEmojis.clear();
  hiddenEmojis.clear();

  searchState.query = "";
  searchState.category = "all";
  searchState.groupByCategory = true;
  setUsageSectionPreferencesForTest({
    showFrequentlyUsed: true,
    showRecentlyUsed: true
  });

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.clear();
  }

  const categoriesEl = document.getElementById("categories");
  if (categoriesEl) {
    categoriesEl.textContent = "";
  }

  const usageTableBody = document.getElementById("emojiUsageTableBody");
  if (usageTableBody) {
    usageTableBody.textContent = "";
  }

  const statusEl = document.getElementById("status");
  if (statusEl) {
    statusEl.textContent = "";
  }
}
