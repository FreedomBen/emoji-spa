import { EMOJI_METADATA } from "./emoji-data.js";

const statusEl = document.getElementById("status");
const categoriesEl = document.getElementById("categories");
const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const groupByCategoryCheckbox = document.getElementById("groupByCategory");
const showFrequentlyUsedCheckbox = document.getElementById("showFrequentlyUsed");
const showRecentlyUsedCheckbox = document.getElementById("showRecentlyUsed");
const contextMenuEl = document.getElementById("emojiContextMenu");
const settingsButton = document.getElementById("settingsButton");
const settingsOverlay = document.getElementById("settingsOverlay");
const closeSettingsButton = document.getElementById("closeSettingsButton");
const resetAllUsageButton = document.getElementById("resetAllUsageButton");
const emojiUsageTableBody = document.getElementById("emojiUsageTableBody");

let emojiRegex = null;
let allCategories = null;
const metadataByEmoji = new Map();

for (const entry of EMOJI_METADATA) {
  if (entry && entry.emoji) {
    metadataByEmoji.set(entry.emoji, entry);
  }
}

const USAGE_STORAGE_KEY = "emojiUsage.v1";
const THEME_STORAGE_KEY = "emojiThemePreference.v1";
const THEME_SYSTEM = "system";
const THEME_LIGHT = "light";
const THEME_DARK = "dark";

const RECENT_LIMIT = 50;
const FREQUENT_LIMIT = 50;
const FREQUENT_MIN_COUNT = 2;

// emoji -> { count: number, lastUsed: number }
const emojiUsage = new Map();
// Set<string> of pinned emoji (iteration order is pin order).
const pinnedEmojis = new Set();
// Set<string> of hidden emoji.
const hiddenEmojis = new Set();
let usageSaveTimeout = null;
let themePreference = THEME_SYSTEM;
let systemDarkQuery = null;
let contextMenuEmoji = null;
let contextMenuCategory = null;

const CATEGORY_KEYWORDS = {
  "Smileys & Emotion": ["smile", "smiley", "emoji", "happy", "sad", "angry", "cry", "laugh", "emotion", "face"],
  "People & Body": ["person", "people", "body", "gesture", "hand", "human"],
  "Animals & Nature": ["animal", "nature", "pet", "wildlife", "plant", "tree"],
  "Food & Drink": ["food", "drink", "snack", "meal", "fruit", "dessert"],
  "Travel & Places": ["travel", "place", "building", "city", "landmark"],
  "Transport & Map": ["transport", "vehicle", "car", "bike", "train", "bus", "map"],
  "Alchemical Symbols": ["symbol", "alchemy"],
  "Geometric Symbols": ["shape", "symbol", "geometric"],
  "Supplemental Arrows": ["arrow", "direction"],
  "Supplemental Symbols & Pictographs": ["symbol", "icon", "pictograph"],
  "Symbols & Pictographs Extended-A": ["symbol", "icon", "pictograph"],
  "Misc Symbols": ["symbol", "misc", "various"],
  "Dingbats": ["dingbat", "symbol", "decorative"],
  "Regional Indicators": ["flag", "country", "region"],
  "Other Emoji": ["emoji", "symbol"]
};

let lastHiddenMatches = 0;
const usageSectionPreferences = {
  showFrequentlyUsed: true,
  showRecentlyUsed: true
};

function syncUsageSectionControls() {
  if (showFrequentlyUsedCheckbox) {
    showFrequentlyUsedCheckbox.checked = usageSectionPreferences.showFrequentlyUsed;
  }
  if (showRecentlyUsedCheckbox) {
    showRecentlyUsedCheckbox.checked = usageSectionPreferences.showRecentlyUsed;
  }
}

function updateUsageSectionPreference(key, value, options = {}) {
  if (!Object.prototype.hasOwnProperty.call(usageSectionPreferences, key)) {
    return false;
  }
  const nextValue = Boolean(value);
  if (usageSectionPreferences[key] === nextValue) {
    return false;
  }
  usageSectionPreferences[key] = nextValue;
  syncUsageSectionControls();
  if (options.persist !== false) {
    persistUsage();
  }
  if (options.rerender !== false) {
    applyFiltersAndRender();
  }
  return true;
}

function setUsageSectionPreferencesForTest(preferences) {
  if (!preferences || typeof preferences !== "object") return;
  for (const key of ["showFrequentlyUsed", "showRecentlyUsed"]) {
    if (typeof preferences[key] === "boolean") {
      updateUsageSectionPreference(key, preferences[key], {
        persist: false,
        rerender: false
      });
    }
  }
}

function setAllCategoriesForTest(categories) {
  allCategories = categories;
}

function getSelectedCategoryFilter() {
  const cat = searchState.category;
  if (
    cat === "Pinned" ||
    cat === "Frequently Used" ||
    cat === "Recently Used" ||
    cat === "Hidden"
  ) {
    return "all";
  }
  return cat;
}

async function loadCldrEmojiNames() {
  try {
    const response = await fetch("./emoji-cldr.json");
    if (!response.ok) {
      return;
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      for (const entry of data) {
        if (!entry || !entry.emoji) continue;
        const emoji = entry.emoji;
        const existing = metadataByEmoji.get(emoji) || {};
        const name = entry.name || existing.name;
        const mergedKeywords = [
          ...(existing.keywords || []),
          ...(Array.isArray(entry.keywords) ? entry.keywords : [])
        ]
          .map((kw) => String(kw))
          .filter((kw) => kw && kw.trim().length > 0);
        const keywords = Array.from(new Set(mergedKeywords));
        metadataByEmoji.set(emoji, { emoji, name, keywords });
      }
    } else if (data && typeof data === "object") {
      for (const [emoji, value] of Object.entries(data)) {
        if (!emoji || !value) continue;
        const existing = metadataByEmoji.get(emoji) || {};
        const name = value.name || existing.name;
        const mergedKeywords = [
          ...(existing.keywords || []),
          ...(Array.isArray(value.keywords) ? value.keywords : [])
        ]
          .map((kw) => String(kw))
          .filter((kw) => kw && kw.trim().length > 0);
        const keywords = Array.from(new Set(mergedKeywords));
        metadataByEmoji.set(emoji, { emoji, name, keywords });
      }
    }
  } catch (error) {
    console.error("Failed to load CLDR emoji names:", error);
  }
}

function loadUsageFromStorage() {
  try {
    const raw = window.localStorage.getItem(USAGE_STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;

    const items = parsed.items && typeof parsed.items === "object" ? parsed.items : parsed;

    for (const [emoji, value] of Object.entries(items)) {
      if (!emoji) continue;

      const count =
        typeof value === "number"
          ? value
          : Number(value && typeof value.count !== "undefined" ? value.count : NaN);

      if (!Number.isFinite(count) || count <= 0) continue;

      const lastUsedRaw = value && value.lastUsed;
      const lastUsed =
        typeof lastUsedRaw === "number" && Number.isFinite(lastUsedRaw) ? lastUsedRaw : 0;

      emojiUsage.set(emoji, { count, lastUsed });
    }

    const pinned = Array.isArray(parsed.pinned) ? parsed.pinned : [];
    for (const emoji of pinned) {
      if (typeof emoji === "string" && emoji) {
        pinnedEmojis.add(emoji);
      }
    }

    const hidden = Array.isArray(parsed.hidden) ? parsed.hidden : [];
    for (const emoji of hidden) {
      if (typeof emoji === "string" && emoji) {
        hiddenEmojis.add(emoji);
      }
    }

    if (typeof parsed.showFrequentlyUsed === "boolean") {
      usageSectionPreferences.showFrequentlyUsed = parsed.showFrequentlyUsed;
    }

    if (typeof parsed.showRecentlyUsed === "boolean") {
      usageSectionPreferences.showRecentlyUsed = parsed.showRecentlyUsed;
    }

    if (typeof parsed.groupByCategory === "boolean") {
      searchState.groupByCategory = parsed.groupByCategory;
      if (groupByCategoryCheckbox) {
        groupByCategoryCheckbox.checked = parsed.groupByCategory;
      }
    }

    syncUsageSectionControls();
  } catch (error) {
    console.error("Failed to load emoji usage from storage:", error);
  }
}

function persistUsage() {
  try {
    const items = {};
    for (const [emoji, stats] of emojiUsage.entries()) {
      if (!stats || typeof stats.count !== "number" || stats.count <= 0) continue;
      items[emoji] = {
        count: stats.count,
        lastUsed: typeof stats.lastUsed === "number" ? stats.lastUsed : 0
      };
    }

    const payload = {
      version: 1,
      items,
      pinned: Array.from(pinnedEmojis),
      hidden: Array.from(hiddenEmojis),
      groupByCategory: Boolean(searchState.groupByCategory),
      showFrequentlyUsed: Boolean(usageSectionPreferences.showFrequentlyUsed),
      showRecentlyUsed: Boolean(usageSectionPreferences.showRecentlyUsed)
    };

    window.localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error("Failed to persist emoji usage:", error);
  }
}

function schedulePersistUsage() {
  if (usageSaveTimeout != null) {
    return;
  }

  usageSaveTimeout = window.setTimeout(() => {
    usageSaveTimeout = null;
    persistUsage();
  }, 1000);
}

function loadThemePreference() {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === THEME_LIGHT || raw === THEME_DARK || raw === THEME_SYSTEM) {
      return raw;
    }
  } catch (error) {
    console.error("Failed to load theme preference from storage:", error);
  }
  return THEME_SYSTEM;
}

function persistThemePreference(value) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch (error) {
    console.error("Failed to persist theme preference:", error);
  }
}

function getSystemPrefersDark() {
  if (!window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

function setEffectiveTheme(effectiveTheme) {
  const body = document.body;
  if (!body) return;
  const theme = effectiveTheme === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
  body.setAttribute("data-theme", theme);
}

function handleSystemThemeChange() {
  if (themePreference !== THEME_SYSTEM) return;
  const effective = getSystemPrefersDark() ? THEME_DARK : THEME_LIGHT;
  setEffectiveTheme(effective);
}

function updateSystemThemeListener() {
  if (!window.matchMedia) return;

  if (systemDarkQuery) {
    try {
      systemDarkQuery.removeEventListener("change", handleSystemThemeChange);
    } catch {
      // ignore
    }
    systemDarkQuery = null;
  }

  if (themePreference !== THEME_SYSTEM) {
    return;
  }

  try {
    systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    systemDarkQuery.addEventListener("change", handleSystemThemeChange);
  } catch {
    systemDarkQuery = null;
  }
}

function applyTheme(preference, persist = true) {
  if (preference !== THEME_LIGHT && preference !== THEME_DARK && preference !== THEME_SYSTEM) {
    preference = THEME_SYSTEM;
  }

  themePreference = preference;
  if (persist) {
    persistThemePreference(preference);
  }

  let effective = preference;
  if (preference === THEME_SYSTEM) {
    effective = getSystemPrefersDark() ? THEME_DARK : THEME_LIGHT;
  }

  setEffectiveTheme(effective);
  updateSystemThemeListener();
}

function syncThemeControlsFromPreference() {
  const radios = document.querySelectorAll('input[name="themePreference"]');
  if (!radios || !radios.length) return;

  for (const node of radios) {
    if (!(node instanceof HTMLInputElement)) continue;
    node.checked = node.value === themePreference;
  }
}

function recordUsage(emoji) {
  if (!emoji) return;

  const now = Date.now();
  const current = emojiUsage.get(emoji) || { count: 0, lastUsed: 0 };
  const next = {
    count: current.count + 1,
    lastUsed: now
  };
  emojiUsage.set(emoji, next);
}

function pinEmoji(emoji) {
  if (!emoji) return;
  pinnedEmojis.add(emoji);
  schedulePersistUsage();
}

function unpinEmoji(emoji) {
  if (!emoji) return;
  if (pinnedEmojis.delete(emoji)) {
    schedulePersistUsage();
  }
}

function hideEmoji(emoji) {
  if (!emoji) return;
  hiddenEmojis.add(emoji);
  schedulePersistUsage();
}

function unhideEmoji(emoji) {
  if (!emoji) return;
  if (hiddenEmojis.delete(emoji)) {
    schedulePersistUsage();
  }
}

function resetUsage(emoji) {
  if (!emoji) return;
  if (emojiUsage.delete(emoji)) {
    schedulePersistUsage();
  }
}

function getPinnedEmojisForCandidates(candidateSet) {
  if (!pinnedEmojis.size || !candidateSet || !candidateSet.size) return [];
  const result = [];
  for (const emoji of pinnedEmojis) {
    if (candidateSet.has(emoji)) {
      result.push(emoji);
    }
  }
  return result;
}

function getFrequentEmojis() {
  if (!emojiUsage.size) return [];

  const items = [];
  for (const [emoji, stats] of emojiUsage.entries()) {
    if (!stats || typeof stats.count !== "number" || stats.count <= 0) continue;
    items.push({
      emoji,
      count: stats.count,
      lastUsed: typeof stats.lastUsed === "number" ? stats.lastUsed : 0
    });
  }

  if (!items.length) return [];

  items.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return (b.lastUsed || 0) - (a.lastUsed || 0);
  });

  const strong = items.filter((item) => item.count >= FREQUENT_MIN_COUNT);
  const base = (strong.length ? strong : items).slice(0, FREQUENT_LIMIT);

  return base.map((item) => item.emoji);
}

function getRecentEmojis(excludeSet) {
  if (!emojiUsage.size) return [];

  const items = [];
  for (const [emoji, stats] of emojiUsage.entries()) {
    if (!stats || !stats.lastUsed) continue;
    if (excludeSet && excludeSet.has(emoji)) continue;
    items.push({
      emoji,
      lastUsed: typeof stats.lastUsed === "number" ? stats.lastUsed : 0
    });
  }

  if (!items.length) return [];

  items.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
  return items.slice(0, RECENT_LIMIT).map((item) => item.emoji);
}

function getHiddenMatchesForCurrentFilters() {
  if (!hiddenEmojis.size) return [];

  const query = searchState.query.trim().toLowerCase();
  const tokens = query ? query.split(/\s+/).filter(Boolean) : [];
  const selectedCategory = searchState.category;
  const baseCategory = getSelectedCategoryFilter();
  const frequentEnabled = usageSectionPreferences.showFrequentlyUsed;
  const recentEnabled = usageSectionPreferences.showRecentlyUsed;

  // Build the candidate hidden emojis for this filter mode.
  let candidates;

  if (selectedCategory === "Pinned") {
    // Hidden + pinned
    candidates = [];
    for (const emoji of hiddenEmojis) {
      if (pinnedEmojis.has(emoji)) {
        candidates.push(emoji);
      }
    }
  } else if (selectedCategory === "Frequently Used" && frequentEnabled) {
    const frequentSet = new Set(getFrequentEmojis());
    candidates = [];
    for (const emoji of hiddenEmojis) {
      if (frequentSet.has(emoji)) {
        candidates.push(emoji);
      }
    }
  } else if (selectedCategory === "Recently Used" && recentEnabled) {
    const recentSet = new Set(getRecentEmojis());
    candidates = [];
    for (const emoji of hiddenEmojis) {
      if (recentSet.has(emoji)) {
        candidates.push(emoji);
      }
    }
  } else {
    // All / base emoji categories / Hidden mode
    if (!allCategories) return [];
    candidates = [];
    for (const emoji of hiddenEmojis) {
      if (!emoji) continue;
      const cp = emoji.codePointAt(0);
      const categoryName = cp != null ? getCategory(cp) : "Other Emoji";
      if (baseCategory !== "all" && categoryName !== baseCategory) {
        continue;
      }
      candidates.push(emoji);
    }
  }

  if (!candidates.length) return [];

  const matchesList = [];

  for (const emoji of candidates) {
    if (!emoji) continue;

    const cp = emoji.codePointAt(0);
    const categoryName = cp != null ? getCategory(cp) : "Other Emoji";

    if (!tokens.length) {
      matchesList.push(emoji);
      continue;
    }

    const haystacks = [];

    const categoryNameLower = categoryName.toLowerCase();
    haystacks.push(categoryNameLower);

    const categoryKeywords = CATEGORY_KEYWORDS[categoryName] || [];
    for (const kw of categoryKeywords) {
      haystacks.push(kw.toLowerCase());
    }

    haystacks.push(emoji);

    const meta = metadataByEmoji.get(emoji);
    if (meta) {
      if (meta.name) {
        haystacks.push(String(meta.name).toLowerCase());
      }
      if (Array.isArray(meta.keywords)) {
        for (const kw of meta.keywords) {
          haystacks.push(String(kw).toLowerCase());
        }
      }
    }

    const matches = tokens.every((token) =>
      haystacks.some((text) => text.includes(token))
    );

    if (matches) {
      matchesList.push(emoji);
    }
  }

  return matchesList;
}

function initEmojiRegex() {
  try {
    // Use Unicode property escapes if available to detect emoji code points.
    emojiRegex = /\p{Emoji}/u;
  } catch {
    emojiRegex = null;
  }
}

function resetEmojiRegexForTest() {
  emojiRegex = null;
}

function isEmojiCodePoint(cp) {
  if (cp === undefined || cp === null) return false;
  if (
    (cp >= 0x1f300 && cp <= 0x1ffff) ||
    (cp >= 0x2600 && cp <= 0x26ff) ||
    (cp >= 0x2700 && cp <= 0x27bf)
  ) {
    return true;
  }
  return false;
}

const searchState = {
  query: "",
  category: "all",
  groupByCategory: true
};

function isEmoji(char) {
  if (!char) return false;
  const cp = char.codePointAt(0);
  if (cp === undefined) return false;

  if (emojiRegex) {
    // Guard against environments that might classify non-emoji characters as Emoji.
    if (!emojiRegex.test(char)) {
      return false;
    }
  }

  // Heuristic based on common emoji code point ranges.
  return isEmojiCodePoint(cp);
}

function getCategory(cp) {
  if (cp >= 0x1f600 && cp <= 0x1f64f) return "Smileys & Emotion";
  if (cp >= 0x1f466 && cp <= 0x1f487) return "People & Body";
  if (cp >= 0x1f400 && cp <= 0x1f4d3) return "Animals & Nature";
  if (cp >= 0x1f347 && cp <= 0x1f37f) return "Food & Drink";
  if (cp >= 0x1f3e0 && cp <= 0x1f3ff) return "Travel & Places";
  if (cp >= 0x1f680 && cp <= 0x1f6ff) return "Transport & Map";
  if (cp >= 0x1f700 && cp <= 0x1f77f) return "Alchemical Symbols";
  if (cp >= 0x1f780 && cp <= 0x1f7ff) return "Geometric Symbols";
  if (cp >= 0x1f800 && cp <= 0x1f8ff) return "Supplemental Arrows";
  if (cp >= 0x1f900 && cp <= 0x1f9ff) return "Supplemental Symbols & Pictographs";
  if (cp >= 0x1fa00 && cp <= 0x1faff) return "Symbols & Pictographs Extended-A";
  if (cp >= 0x2600 && cp <= 0x26ff) return "Misc Symbols";
  if (cp >= 0x2700 && cp <= 0x27bf) return "Dingbats";
  if (cp >= 0x1f1e6 && cp <= 0x1f1ff) return "Regional Indicators";
  return "Other Emoji";
}

function generateEmojiByCategoryInternal(maxCodePoint, isEmojiFn, getCategoryFn) {
  const categories = new Map();
  const max =
    typeof maxCodePoint === "number" && Number.isFinite(maxCodePoint) && maxCodePoint >= 0
      ? Math.floor(maxCodePoint)
      : 0x10ffff;
  const isEmojiImpl = typeof isEmojiFn === "function" ? isEmojiFn : isEmoji;
  const getCategoryImpl = typeof getCategoryFn === "function" ? getCategoryFn : getCategory;

  for (let cp = 0; cp <= max; cp++) {
    const char = String.fromCodePoint(cp);
    if (!isEmojiImpl(char)) continue;

    // Filter out variation selectors and combining marks commonly used with emoji.
    if (cp === 0xfe0f || cp === 0x20e3) continue;

    const category = getCategoryImpl(cp);
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category).push(char);
  }

  // Sort categories alphabetically, emojis by code point.
  const sorted = new Map(
    Array.from(categories.entries())
      .map(([name, list]) => [name, Array.from(new Set(list)).sort((a, b) => a.codePointAt(0) - b.codePointAt(0))])
      .sort(([a], [b]) => a.localeCompare(b))
  );

  return sorted;
}

function generateEmojiByCategory() {
  return generateEmojiByCategoryInternal(0x10ffff, isEmoji, getCategory);
}

async function copyEmoji(emoji) {
  // Track usage for Frequently/Recently Used sections.
  recordUsage(emoji);
  schedulePersistUsage();
  applyFiltersAndRender();

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(emoji);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = emoji;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setStatus(`Copied ${emoji} to clipboard.`);
  } catch (error) {
    console.error("Failed to copy emoji:", error);
    setStatus("Failed to copy emoji to clipboard.");
  }
}

function attachEmojiEventHandlers(button, emoji, categoryName) {
  const LONG_PRESS_MS = 500;
  let longPressTimeoutId = null;
  let longPressTriggered = false;
  let lastPointerEvent = null;

  function clearLongPressTimer() {
    if (longPressTimeoutId != null) {
      window.clearTimeout(longPressTimeoutId);
      longPressTimeoutId = null;
    }
  }

  button.addEventListener("click", (event) => {
    if (longPressTriggered) {
      event.preventDefault();
      event.stopPropagation();
      longPressTriggered = false;
      return;
    }
    copyEmoji(emoji);
  });

  button.addEventListener("contextmenu", (event) =>
    handleEmojiContextMenu(event, emoji, categoryName)
  );

  button.addEventListener("pointerdown", (event) => {
    if (event.pointerType && event.pointerType !== "touch") {
      return;
    }
    lastPointerEvent = event;
    longPressTriggered = false;
    clearLongPressTimer();
    longPressTimeoutId = window.setTimeout(() => {
      longPressTimeoutId = null;
      longPressTriggered = true;
      showEmojiContextMenu(lastPointerEvent, emoji, categoryName);
    }, LONG_PRESS_MS);
  });

  button.addEventListener("pointerup", (event) => {
    if (event.pointerType && event.pointerType !== "touch") {
      return;
    }
    clearLongPressTimer();
  });

  button.addEventListener("pointercancel", (event) => {
    if (event.pointerType && event.pointerType !== "touch") {
      return;
    }
    clearLongPressTimer();
  });

  button.addEventListener("pointerleave", (event) => {
    if (event.pointerType && event.pointerType !== "touch") {
      return;
    }
    clearLongPressTimer();
  });
}

function renderCategories(categories, groupByCategory) {
  if (!categories || categories.size === 0) {
    const empty = document.createElement("p");
    let message = "No emoji match your current filters.";
    if (lastHiddenMatches > 0) {
      message +=
        " Some hidden emoji do match and can be found in the Hidden section below.";
    }
    empty.textContent = message;
    categoriesEl.appendChild(empty);
    return;
  }

  if (groupByCategory) {
    for (const [name, emojis] of categories.entries()) {
      const section = document.createElement("section");

      const heading = document.createElement("h2");
      heading.textContent = `${name} (${emojis.length})`;
      section.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "emoji-grid";

      for (const emoji of emojis) {
        const button = document.createElement("button");
        button.className = "emoji-button";
        button.textContent = emoji;
        button.title = getEmojiTitle(emoji, name);
        attachEmojiEventHandlers(button, emoji, name);
        grid.appendChild(button);
      }

      section.appendChild(grid);
      categoriesEl.appendChild(section);
    }
  } else {
    // Flat search results view.
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = "Search results";
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "emoji-grid";

    for (const [name, emojis] of categories.entries()) {
      for (const emoji of emojis) {
        const button = document.createElement("button");
        button.className = "emoji-button";
        button.textContent = emoji;
        button.title = getEmojiTitle(emoji, name);
        attachEmojiEventHandlers(button, emoji, name);
        grid.appendChild(button);
      }
    }

    section.appendChild(grid);
    categoriesEl.appendChild(section);
  }
}

function getEmojiTitle(emoji, categoryName) {
  const meta = metadataByEmoji.get(emoji);
  const stats = emojiUsage.get(emoji);
  const usageCount = stats && typeof stats.count === "number" ? stats.count : 0;

  let label;
  if (meta && meta.name) {
    label = meta.name;
  } else if (categoryName) {
    label = categoryName;
  } else {
    label = "";
  }

  let base = emoji;
  if (label) {
    base += ` — ${label}`;
  }

  if (usageCount > 0) {
    const timesLabel = usageCount === 1 ? "time" : "times";
    base += ` (used ${usageCount} ${timesLabel})`;
  }

  return base;
}

function renderSpecialSection(title, emojis) {
  if (!emojis || !emojis.length) return;

  const section = document.createElement("section");

  const heading = document.createElement("h2");
  heading.textContent = `${title} (${emojis.length})`;
  section.appendChild(heading);

  const grid = document.createElement("div");
  grid.className = "emoji-grid";

  for (const emoji of emojis) {
    const button = document.createElement("button");
    button.className = "emoji-button";
    button.textContent = emoji;
    button.title = getEmojiTitle(emoji, title);
    attachEmojiEventHandlers(button, emoji, title);
    grid.appendChild(button);
  }

  section.appendChild(grid);
  categoriesEl.appendChild(section);
}

function renderHiddenSection(hiddenList) {
  const list = Array.isArray(hiddenList)
    ? hiddenList
    : Array.from(hiddenEmojis);
  if (!list.length) return;

  const section = document.createElement("section");
  const details = document.createElement("details");
  details.className = "emoji-hidden-section";

  const summary = document.createElement("summary");
  summary.textContent = `Hidden (${list.length})`;
  details.appendChild(summary);

  const grid = document.createElement("div");
  grid.className = "emoji-grid";

  for (const emoji of list) {
    const button = document.createElement("button");
    button.className = "emoji-button";
    button.textContent = emoji;
    button.title = getEmojiTitle(emoji, "Hidden");
    attachEmojiEventHandlers(button, emoji, "Hidden");
    grid.appendChild(button);
  }

  details.appendChild(grid);
  section.appendChild(details);
  categoriesEl.appendChild(section);
}

function showEmojiContextMenu(event, emoji, categoryName) {
  if (!contextMenuEl) return;

  event.preventDefault();
  event.stopPropagation();

  contextMenuEmoji = emoji;
  contextMenuCategory = categoryName || null;

  const pinButton = contextMenuEl.querySelector('[data-action="toggle-pin"]');
  if (pinButton && pinButton instanceof HTMLElement) {
    pinButton.textContent = pinnedEmojis.has(emoji) ? "Unpin" : "Pin";
  }

  const hideButton = contextMenuEl.querySelector('[data-action="toggle-hide"]');
  if (hideButton && hideButton instanceof HTMLElement) {
    hideButton.textContent = hiddenEmojis.has(emoji) ? "Unhide" : "Hide";
  }

  contextMenuEl.classList.remove("emoji-context-menu-hidden");

  const menuRect = contextMenuEl.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

  let x = event.clientX;
  let y = event.clientY;

  const width = menuRect.width || 160;
  const height = menuRect.height || 100;

  if (x + width > viewportWidth - 8) {
    x = Math.max(8, viewportWidth - width - 8);
  }
  if (y + height > viewportHeight - 8) {
    y = Math.max(8, viewportHeight - height - 8);
  }

  contextMenuEl.style.left = `${x}px`;
  contextMenuEl.style.top = `${y}px`;
}

function hideEmojiContextMenu() {
  if (!contextMenuEl) return;
  contextMenuEl.classList.add("emoji-context-menu-hidden");
  contextMenuEmoji = null;
  contextMenuCategory = null;
}

function handleEmojiContextMenu(event, emoji, categoryName) {
  showEmojiContextMenu(event, emoji, categoryName);
}

function setStatus(text) {
  if (statusEl) {
    statusEl.textContent = text;
  }
}

function filterCategories() {
  if (!allCategories) {
    return new Map();
  }

  const query = searchState.query.trim().toLowerCase();
  const selectedCategory = getSelectedCategoryFilter();
  const tokens = query ? query.split(/\s+/).filter(Boolean) : [];

  const result = new Map();

  for (const [name, emojis] of allCategories.entries()) {
    if (selectedCategory !== "all" && name !== selectedCategory) {
      continue;
    }

    const filtered = emojis.filter((emoji) => {
      // Always hide emojis that the user has explicitly hidden.
      if (hiddenEmojis.has(emoji)) return false;

      // No search text: keep everything within the selected category.
      if (!tokens.length) return true;

      const haystacks = [];

      const categoryNameLower = name.toLowerCase();
      haystacks.push(categoryNameLower);

      const categoryKeywords = CATEGORY_KEYWORDS[name] || [];
      for (const kw of categoryKeywords) {
        haystacks.push(kw.toLowerCase());
      }

      // Emoji character itself (so you can paste an emoji into search).
      haystacks.push(emoji);

      const meta = metadataByEmoji.get(emoji);
      if (meta) {
        if (meta.name) {
          haystacks.push(String(meta.name).toLowerCase());
        }
        if (Array.isArray(meta.keywords)) {
          for (const kw of meta.keywords) {
            haystacks.push(String(kw).toLowerCase());
          }
        }
      }

      // Match if every query token appears in at least one of the fields.
      return tokens.every((token) =>
        haystacks.some((text) => text.includes(token))
      );
    });

    if (filtered.length > 0) {
      result.set(name, filtered);
    }
  }

  return result;
}

function getEmojiCategoryName(emoji) {
  if (!emoji) return "";
  const cp = emoji.codePointAt(0);
  return cp != null ? getCategory(cp) : "Other Emoji";
}

function getEmojiUsageRows() {
  const rows = [];
  const seen = new Set();

  if (!emojiUsage.size) {
    return rows;
  }

  if (allCategories) {
    for (const [categoryName, emojis] of allCategories.entries()) {
      for (const emoji of emojis) {
        if (!emoji || seen.has(emoji)) continue;
        seen.add(emoji);
        const stats = emojiUsage.get(emoji);
        const count =
          stats && typeof stats.count === "number" && Number.isFinite(stats.count)
            ? stats.count
            : 0;
        const lastUsed =
          stats && typeof stats.lastUsed === "number" && Number.isFinite(stats.lastUsed)
            ? stats.lastUsed
            : 0;
        const meta = metadataByEmoji.get(emoji);
        const name = meta && meta.name ? meta.name : "";
        rows.push({
          emoji,
          name,
          category: categoryName || getEmojiCategoryName(emoji),
          count,
          lastUsed
        });
      }
    }
  }

  for (const [emoji, stats] of emojiUsage.entries()) {
    if (seen.has(emoji)) continue;
    const count =
      stats && typeof stats.count === "number" && Number.isFinite(stats.count)
        ? stats.count
        : 0;
    const lastUsed =
      stats && typeof stats.lastUsed === "number" && Number.isFinite(stats.lastUsed)
        ? stats.lastUsed
        : 0;
    const meta = metadataByEmoji.get(emoji);
    const name = meta && meta.name ? meta.name : "";
    rows.push({
      emoji,
      name,
      category: getEmojiCategoryName(emoji),
      count,
      lastUsed
    });
    seen.add(emoji);
  }

  rows.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (b.lastUsed !== a.lastUsed) return (b.lastUsed || 0) - (a.lastUsed || 0);
    return a.emoji.localeCompare(b.emoji);
  });

  return rows;
}

function renderEmojiUsageTable() {
  if (!emojiUsageTableBody) return;

  const rows = getEmojiUsageRows();
  emojiUsageTableBody.textContent = "";

  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = "No emoji usage recorded yet.";
    tr.appendChild(td);
    emojiUsageTableBody.appendChild(tr);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const row of rows) {
    const tr = document.createElement("tr");

    const emojiCell = document.createElement("td");
    emojiCell.textContent = row.emoji;
    tr.appendChild(emojiCell);

    const nameCell = document.createElement("td");
    nameCell.textContent = row.name || "";
    tr.appendChild(nameCell);

    const categoryCell = document.createElement("td");
    categoryCell.textContent = row.category || "";
    tr.appendChild(categoryCell);

    const countCell = document.createElement("td");
    countCell.textContent = String(row.count || 0);
    tr.appendChild(countCell);

    fragment.appendChild(tr);
  }

  emojiUsageTableBody.appendChild(fragment);
}

function resetAllUsageCounts() {
  if (!emojiUsage.size) return;
  emojiUsage.clear();
  schedulePersistUsage();
  applyFiltersAndRender();
  renderEmojiUsageTable();
  setStatus("All emoji usage counts have been reset.");
}

function openSettingsPanel() {
  if (!settingsOverlay) return;
  settingsOverlay.classList.remove("settings-hidden");
  settingsOverlay.setAttribute("aria-hidden", "false");
  renderEmojiUsageTable();
  syncThemeControlsFromPreference();
}

function closeSettingsPanel() {
  if (!settingsOverlay) return;
  settingsOverlay.classList.add("settings-hidden");
  settingsOverlay.setAttribute("aria-hidden", "true");
}

function computeCategorySelectOptions(categories, previousValue) {
  const items = [];
  const frequentEnabled = usageSectionPreferences.showFrequentlyUsed;
  const recentEnabled = usageSectionPreferences.showRecentlyUsed;

  items.push({ value: "all", label: "All categories" });

  if (pinnedEmojis.size > 0) {
    items.push({ value: "Pinned", label: "Pinned" });
  }

  if (frequentEnabled && getFrequentEmojis().length > 0) {
    items.push({ value: "Frequently Used", label: "Frequently Used" });
  }

  if (recentEnabled && getRecentEmojis().length > 0) {
    items.push({ value: "Recently Used", label: "Recently Used" });
  }

  const seen = new Set(items.map((item) => item.value));

  if (categories && typeof categories.entries === "function") {
    const names = [];
    for (const [name] of categories.entries()) {
      if (!name || seen.has(name)) continue;
      names.push(name);
    }
    names.sort((a, b) => a.localeCompare(b));
    for (const name of names) {
      items.push({ value: name, label: name });
      seen.add(name);
    }
  }

  if (hiddenEmojis.size > 0) {
    items.push({ value: "Hidden", label: "Hidden" });
    seen.add("Hidden");
  }

  const values = items.map((item) => item.value);
  const selectedValue =
    previousValue && values.includes(previousValue) ? previousValue : "all";

  return { items, selectedValue };
}

function populateCategorySelect(categories) {
  if (!categorySelect) return;

  const previousValue = categorySelect.value || searchState.category || "all";

  const { items, selectedValue } = computeCategorySelectOptions(categories, previousValue);

  categorySelect.innerHTML = "";

  function addOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    categorySelect.appendChild(option);
  }

  for (const item of items) {
    addOption(item.value, item.label);
  }

  categorySelect.value = selectedValue;
  searchState.category = categorySelect.value;
}

function applyFiltersAndRender() {
  const filtered = filterCategories();
  categoriesEl.innerHTML = "";

  const hiddenMatches = getHiddenMatchesForCurrentFilters();
  lastHiddenMatches = hiddenMatches.length;

  if (allCategories) {
    populateCategorySelect(allCategories);
  }

  // Build the set of emojis that are part of the current filtered result.
  const candidateSet = new Set();
  for (const emojis of filtered.values()) {
    for (const emoji of emojis) {
      candidateSet.add(emoji);
    }
  }

  const hasQuery = searchState.query.trim().length > 0;
  const selectedCategory = searchState.category;
  const frequentEnabled = usageSectionPreferences.showFrequentlyUsed;
  const recentEnabled = usageSectionPreferences.showRecentlyUsed;

  // Special filter modes (Pinned / Frequently Used / Recently Used / Hidden)
  if (selectedCategory === "Pinned") {
    const pinnedForView = getPinnedEmojisForCandidates(candidateSet);
    if (pinnedForView.length) {
      renderSpecialSection("Pinned", pinnedForView);
    } else {
      renderCategories(new Map(), searchState.groupByCategory);
    }
    if (hiddenMatches.length > 0) {
      renderHiddenSection(hiddenMatches);
    }
    return;
  }

  if (selectedCategory === "Frequently Used" && frequentEnabled) {
    const frequentAll = getFrequentEmojis();
    const frequentEmojis = frequentAll.filter((emoji) => candidateSet.has(emoji));
    if (frequentEmojis.length) {
      renderSpecialSection("Frequently Used", frequentEmojis);
    } else {
      renderCategories(new Map(), searchState.groupByCategory);
    }
    if (hiddenMatches.length > 0) {
      renderHiddenSection(hiddenMatches);
    }
    return;
  }

  if (selectedCategory === "Recently Used" && recentEnabled) {
    const recentAll = getRecentEmojis();
    const recentEmojis = recentAll.filter((emoji) => candidateSet.has(emoji));
    if (recentEmojis.length) {
      renderSpecialSection("Recently Used", recentEmojis);
    } else {
      renderCategories(new Map(), searchState.groupByCategory);
    }
    if (hiddenMatches.length > 0) {
      renderHiddenSection(hiddenMatches);
    }
    return;
  }

  if (selectedCategory === "Hidden") {
    // Only show the Hidden section in this mode.
    if (!hasQuery) {
      // No search text: show all hidden emoji.
      if (hiddenEmojis.size > 0) {
        renderHiddenSection();
      } else {
        renderCategories(new Map(), searchState.groupByCategory);
      }
    } else {
      // With search text: only show matching hidden emoji.
      if (hiddenMatches.length > 0) {
        renderHiddenSection(hiddenMatches);
      } else {
        renderCategories(new Map(), searchState.groupByCategory);
      }
    }
    return;
  }

  // Default mode: show pinned / frequent / recent sections plus categories,
  // then the Hidden section (if appropriate).
  if (candidateSet.size > 0) {
    const pinnedForView = getPinnedEmojisForCandidates(candidateSet);
    if (pinnedForView.length) {
      renderSpecialSection("Pinned", pinnedForView);
    }

    if (frequentEnabled) {
      const frequentAll = getFrequentEmojis();
      const frequentEmojis = frequentAll.filter((emoji) => candidateSet.has(emoji));
      if (frequentEmojis.length) {
        renderSpecialSection("Frequently Used", frequentEmojis);
      }
    }

    if (recentEnabled) {
      const recentAll = getRecentEmojis();
      const recentEmojis = recentAll.filter((emoji) => candidateSet.has(emoji));
      if (recentEmojis.length) {
        renderSpecialSection("Recently Used", recentEmojis);
      }
    }
  }

  renderCategories(filtered, searchState.groupByCategory);

  if (!hasQuery) {
    const baseCategory = getSelectedCategoryFilter();
    if (baseCategory === "all") {
      if (hiddenEmojis.size > 0) {
        renderHiddenSection();
      }
    } else if (hiddenMatches.length > 0) {
      renderHiddenSection(hiddenMatches);
    }
  } else if (hiddenMatches.length > 0) {
    renderHiddenSection(hiddenMatches);
  }
}

let controlsInitialized = false;

function initControls() {
  if (controlsInitialized) return;
  controlsInitialized = true;

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      searchState.query = event.target.value || "";
      applyFiltersAndRender();
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", (event) => {
      searchState.category = event.target.value || "all";
      applyFiltersAndRender();
    });
  }

  if (groupByCategoryCheckbox) {
    groupByCategoryCheckbox.addEventListener("change", (event) => {
      searchState.groupByCategory = Boolean(event.target.checked);
      schedulePersistUsage();
      applyFiltersAndRender();
    });
  }

  if (showFrequentlyUsedCheckbox) {
    showFrequentlyUsedCheckbox.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      updateUsageSectionPreference("showFrequentlyUsed", target.checked);
    });
  }

  if (showRecentlyUsedCheckbox) {
    showRecentlyUsedCheckbox.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      updateUsageSectionPreference("showRecentlyUsed", target.checked);
    });
  }

  if (contextMenuEl) {
    contextMenuEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.getAttribute("data-action");
      if (!action) return;

      if (!contextMenuEmoji) {
        hideEmojiContextMenu();
        return;
      }

      if (action === "toggle-pin") {
        if (pinnedEmojis.has(contextMenuEmoji)) {
          unpinEmoji(contextMenuEmoji);
        } else {
          pinEmoji(contextMenuEmoji);
        }
        applyFiltersAndRender();
      } else if (action === "toggle-hide") {
        if (hiddenEmojis.has(contextMenuEmoji)) {
          unhideEmoji(contextMenuEmoji);
        } else {
          hideEmoji(contextMenuEmoji);
        }
        applyFiltersAndRender();
      } else if (action === "reset-usage") {
        resetUsage(contextMenuEmoji);
        applyFiltersAndRender();
      }

      hideEmojiContextMenu();
    });
  }

  document.addEventListener("click", (event) => {
    if (!contextMenuEl) return;
    if (contextMenuEl.contains(event.target)) return;
    hideEmojiContextMenu();
  });

  window.addEventListener("resize", () => {
    hideEmojiContextMenu();
  });

  window.addEventListener(
    "scroll",
    () => {
      hideEmojiContextMenu();
    },
    true
  );

  if (settingsButton) {
    settingsButton.addEventListener("click", () => {
      openSettingsPanel();
    });
  }

  if (closeSettingsButton) {
    closeSettingsButton.addEventListener("click", () => {
      closeSettingsPanel();
    });
  }

  if (settingsOverlay) {
    settingsOverlay.addEventListener("click", (event) => {
      if (event.target === settingsOverlay) {
        closeSettingsPanel();
      }
    });
  }

  if (resetAllUsageButton) {
    resetAllUsageButton.addEventListener("click", () => {
      if (!emojiUsage.size) return;
      const confirmed = window.confirm(
        "Reset emoji usage counts for all emoji? This cannot be undone."
      );
      if (!confirmed) return;
      resetAllUsageCounts();
    });
  }

  const themeRadios = document.querySelectorAll('input[name="themePreference"]');
  if (themeRadios && themeRadios.length) {
    for (const node of themeRadios) {
      if (!(node instanceof HTMLInputElement)) continue;
      node.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || !target.checked) return;
        const value = target.value;
        applyTheme(value);
      });
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (settingsOverlay && !settingsOverlay.classList.contains("settings-hidden")) {
        event.preventDefault();
        closeSettingsPanel();
      } else {
        hideEmojiContextMenu();
      }
    }
  });

  syncUsageSectionControls();
}

function init() {
  initEmojiRegex();
  themePreference = loadThemePreference();
  applyTheme(themePreference, false);
  initControls();
  setStatus("Generating emoji list...");

  // Yield to the UI thread before heavy work.
  setTimeout(async () => {
    loadUsageFromStorage();
    await loadCldrEmojiNames();
    allCategories = generateEmojiByCategory();
    populateCategorySelect(allCategories);
    applyFiltersAndRender();
    setStatus("Use the search and filters above, then click an emoji to copy it to the clipboard.");
  }, 10);
}

document.addEventListener("DOMContentLoaded", init);

export {
  USAGE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  THEME_SYSTEM,
  THEME_LIGHT,
  THEME_DARK,
  RECENT_LIMIT,
  FREQUENT_LIMIT,
  FREQUENT_MIN_COUNT,
  CATEGORY_KEYWORDS,
  metadataByEmoji,
  emojiUsage,
  pinnedEmojis,
  hiddenEmojis,
  searchState,
  updateUsageSectionPreference,
  setUsageSectionPreferencesForTest,
  initEmojiRegex,
  resetEmojiRegexForTest,
  isEmoji,
  getCategory,
  generateEmojiByCategory,
  generateEmojiByCategoryInternal as generateEmojiByCategoryForTest,
  loadCldrEmojiNames,
  loadUsageFromStorage,
  persistUsage,
  schedulePersistUsage,
  getPinnedEmojisForCandidates,
  getFrequentEmojis,
  getRecentEmojis,
  getHiddenMatchesForCurrentFilters,
  filterCategories,
  getEmojiCategoryName,
  getEmojiUsageRows,
  renderEmojiUsageTable,
  resetAllUsageCounts,
  openSettingsPanel,
  closeSettingsPanel,
  computeCategorySelectOptions,
  populateCategorySelect,
  applyFiltersAndRender,
  loadThemePreference,
  persistThemePreference,
  applyTheme,
  syncThemeControlsFromPreference,
  initControls,
  handleSystemThemeChange,
  recordUsage,
  pinEmoji,
  unpinEmoji,
  hideEmoji,
  unhideEmoji,
  resetUsage,
  copyEmoji,
  setStatus,
  setAllCategoriesForTest,
  init
};
