import {
  emojiUsage,
  pinnedEmojis,
  hiddenEmojis,
  searchState,
  setAllCategoriesForTest
} from "../dist/app.js";

export function resetAppState() {
  setAllCategoriesForTest(null);

  emojiUsage.clear();
  pinnedEmojis.clear();
  hiddenEmojis.clear();

  searchState.query = "";
  searchState.category = "all";
  searchState.groupByCategory = true;

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

