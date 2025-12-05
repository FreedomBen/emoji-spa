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
const TEXT_ENTRY_INPUT_TYPES = new Set([
  "text",
  "search",
  "url",
  "email",
  "password",
  "tel",
  "number",
]);

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
let currentEmojiFocusButton = null;
let lastFocusedEmojiKey = null;
let shouldRestoreEmojiFocus = false;
const KEYBOARD_TOOLTIP_DELAY_MS = 1000;
const KEYBOARD_TOOLTIP_ID = "emojiKeyboardTooltip";
let emojiKeyboardTooltipEl = null;
let keyboardTooltipTimeoutId = null;
let keyboardTooltipTarget = null;
let lastInteractionWasKeyboard = false;

function isRunningInTauri() {
  return (
    typeof window !== "undefined" &&
    typeof window.__TAURI__ === "object" &&
    window.__TAURI__ !== null &&
    typeof window.__TAURI__.invoke === "function"
  );
}

function requestTauriWindowClose() {
  if (!isRunningInTauri()) return false;
  try {
    const result = window.__TAURI__.invoke("close_app_window");
    if (result && typeof result.then === "function") {
      result.catch((error) => {
        console.error("Failed to close Tauri window:", error);
      });
    }
    return true;
  } catch (error) {
    console.error("Failed to close Tauri window:", error);
    return false;
  }
}

function isEmojiGridVisible(grid) {
  if (!grid) return false;
  const detailsParent = grid.closest("details");
  if (detailsParent && !detailsParent.open) {
    return false;
  }
  return true;
}

function getVisibleEmojiGrids() {
  const grids = categoriesEl ? Array.from(categoriesEl.querySelectorAll(".emoji-grid")) : [];
  return grids.filter((grid) => isEmojiGridVisible(grid));
}

function getVisibleEmojiButtons() {
  const grids = getVisibleEmojiGrids();
  const buttons = [];
  for (const grid of grids) {
    buttons.push(...grid.querySelectorAll(".emoji-button"));
  }
  return buttons;
}

function ensureEmojiTooltipElement() {
  if (emojiKeyboardTooltipEl && emojiKeyboardTooltipEl.isConnected) {
    return emojiKeyboardTooltipEl;
  }
  if (!document || !document.body) return null;
  const tooltip = document.createElement("div");
  tooltip.id = KEYBOARD_TOOLTIP_ID;
  tooltip.className = "emoji-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.setAttribute("aria-hidden", "true");
  document.body.appendChild(tooltip);
  emojiKeyboardTooltipEl = tooltip;
  return tooltip;
}

function cancelKeyboardTooltipTimer() {
  if (keyboardTooltipTimeoutId != null) {
    window.clearTimeout(keyboardTooltipTimeoutId);
    keyboardTooltipTimeoutId = null;
  }
}

function hideKeyboardTooltip() {
  cancelKeyboardTooltipTimer();
  if (keyboardTooltipTarget && keyboardTooltipTarget instanceof HTMLElement) {
    if (keyboardTooltipTarget.getAttribute("aria-describedby") === KEYBOARD_TOOLTIP_ID) {
      keyboardTooltipTarget.removeAttribute("aria-describedby");
    }
  }
  keyboardTooltipTarget = null;
  const tooltip = emojiKeyboardTooltipEl;
  if (!tooltip) return;
  tooltip.classList.remove("emoji-tooltip-visible");
  tooltip.setAttribute("aria-hidden", "true");
}

function positionKeyboardTooltip(button, tooltip) {
  if (!button || !tooltip) return;
  const rect = button.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const padding = 8;
  let top = rect.bottom + 8;
  if (tooltipRect.height && top + tooltipRect.height > viewportHeight - padding) {
    top = Math.max(padding, rect.top - tooltipRect.height - 8);
  }
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
  left = Math.max(padding, Math.min(left, viewportWidth - tooltipRect.width - padding));
  tooltip.style.top = `${Math.round(top)}px`;
  tooltip.style.left = `${Math.round(left)}px`;
}

function showKeyboardTooltip(button) {
  if (!(button instanceof HTMLElement)) return;
  const label = button.getAttribute("title") || "";
  if (!label) {
    hideKeyboardTooltip();
    return;
  }
  const tooltip = ensureEmojiTooltipElement();
  if (!tooltip) return;
  tooltip.textContent = label;
  tooltip.classList.remove("emoji-tooltip-visible");
  tooltip.setAttribute("aria-hidden", "false");
  tooltip.style.top = "0px";
  tooltip.style.left = "0px";
  keyboardTooltipTarget = button;
  button.setAttribute("aria-describedby", KEYBOARD_TOOLTIP_ID);
  positionKeyboardTooltip(button, tooltip);
  window.requestAnimationFrame(() => {
    if (keyboardTooltipTarget === button) {
      tooltip.classList.add("emoji-tooltip-visible");
    }
  });
}

function scheduleKeyboardTooltip(button) {
  cancelKeyboardTooltipTimer();
  if (!(button instanceof HTMLElement)) return;
  if (!lastInteractionWasKeyboard) {
    hideKeyboardTooltip();
    return;
  }
  keyboardTooltipTimeoutId = window.setTimeout(() => {
    keyboardTooltipTimeoutId = null;
    showKeyboardTooltip(button);
  }, KEYBOARD_TOOLTIP_DELAY_MS);
}

function findAdjacentEmojiGrid(currentGrid, direction) {
  if (!currentGrid || !Number.isInteger(direction) || direction === 0) return null;
  const grids = getVisibleEmojiGrids();
  if (!grids.length) return null;
  const index = grids.indexOf(currentGrid);
  if (index === -1) return null;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= grids.length) return null;
  return grids[nextIndex];
}

function getAlignedButtonFromGrid(grid, preferLastRow, columnIndex) {
  if (!grid) return null;
  const buttons = Array.from(grid.querySelectorAll(".emoji-button"));
  if (!buttons.length) return null;
  const columns = getEmojiGridColumnCount(buttons) || buttons.length;
  const safeColumn = Math.max(0, Math.min(columnIndex, columns - 1));
  if (preferLastRow) {
    const totalRows = Math.ceil(buttons.length / columns);
    const lastRowStart = (totalRows - 1) * columns;
    const lastRowLength = buttons.length - lastRowStart;
    const rowOffset = Math.min(safeColumn, Math.max(0, lastRowLength - 1));
    return buttons[lastRowStart + rowOffset] || buttons[buttons.length - 1];
  }
  // Prefer first row (top) when moving downward into a new grid.
  const firstRowLength = Math.min(columns, buttons.length);
  const rowOffset = Math.min(safeColumn, firstRowLength - 1);
  return buttons[rowOffset] || buttons[0];
}

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

async function loadSlackEmojiNames() {
  try {
    const response = await fetch("./emoji-slack.json");
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
    console.error("Failed to load Slack emoji names:", error);
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

function resetUsageSaveTimerForTest() {
  if (usageSaveTimeout != null) {
    window.clearTimeout(usageSaveTimeout);
    usageSaveTimeout = null;
  }
}

function flushUsageSaveTimerForTest() {
  if (usageSaveTimeout == null) {
    return false;
  }
  const timeoutId = usageSaveTimeout;
  usageSaveTimeout = null;
  try {
    window.clearTimeout(timeoutId);
  } catch {
    // ignore
  }
  persistUsage();
  return true;
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

function getEmojiButtonKey(button) {
  if (!(button instanceof HTMLElement)) return "";
  const section = button.dataset && button.dataset.section ? button.dataset.section : "";
  const emoji = button.dataset && button.dataset.emoji ? button.dataset.emoji : button.textContent || "";
  return `${section}::${emoji}`;
}

function setActiveEmojiButton(button, options = {}) {
  if (!(button instanceof HTMLElement)) return;
  if (!button.isConnected) return;
  if (currentEmojiFocusButton && currentEmojiFocusButton !== button) {
    currentEmojiFocusButton.setAttribute("tabindex", "-1");
  }
  currentEmojiFocusButton = button;
  lastFocusedEmojiKey = getEmojiButtonKey(button);
  button.setAttribute("tabindex", "0");
  if (options.focus && typeof button.focus === "function") {
    button.focus();
  }
}

function initializeEmojiKeyboardFocus() {
  const buttons = getVisibleEmojiButtons();
  if (!buttons.length) {
    currentEmojiFocusButton = null;
    shouldRestoreEmojiFocus = false;
    return;
  }
  let target = null;
  if (lastFocusedEmojiKey) {
    target = buttons.find((btn) => getEmojiButtonKey(btn) === lastFocusedEmojiKey) || null;
  }
  if (!target) {
    target = buttons[0];
  }
  for (const button of buttons) {
    if (button === target) {
      button.setAttribute("tabindex", "0");
      currentEmojiFocusButton = button;
    } else {
      button.setAttribute("tabindex", "-1");
    }
  }
  if (target && shouldRestoreEmojiFocus && typeof target.focus === "function") {
    target.focus();
  }
  shouldRestoreEmojiFocus = false;
}

function getEmojiGridColumnCount(buttons) {
  if (!buttons.length) return 0;
  const firstTop = buttons[0].offsetTop;
  let columns = 0;
  for (const button of buttons) {
    if (button.offsetTop !== firstTop) {
      break;
    }
    columns += 1;
  }
  return Math.max(columns, 1);
}

function handleEmojiKeyNavigation(event, button) {
  if (!(button instanceof HTMLElement)) return false;
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }
  const key = event.key;
  if (
    key !== "ArrowLeft" &&
    key !== "ArrowRight" &&
    key !== "ArrowUp" &&
    key !== "ArrowDown" &&
    key !== "Home" &&
    key !== "End"
  ) {
    return false;
  }

  const grid = button.closest(".emoji-grid");
  if (!grid) return false;

  const visibleGrids = getVisibleEmojiGrids();
  const firstVisibleGrid = visibleGrids.length ? visibleGrids[0] : null;

  const buttons = Array.from(grid.querySelectorAll(".emoji-button"));
  const currentIndex = buttons.indexOf(button);
  if (currentIndex === -1) return false;

  const length = buttons.length;
  let targetButton = null;

  if (key === "ArrowLeft") {
    if (currentIndex > 0) {
      targetButton = buttons[currentIndex - 1];
    } else {
      const prevGrid = findAdjacentEmojiGrid(grid, -1);
      if (prevGrid) {
        const prevButtons = Array.from(prevGrid.querySelectorAll(".emoji-button"));
        if (prevButtons.length) {
          targetButton = prevButtons[prevButtons.length - 1];
        }
      }
    }
  } else if (key === "ArrowRight") {
    if (currentIndex < length - 1) {
      targetButton = buttons[currentIndex + 1];
    } else {
      const nextGrid = findAdjacentEmojiGrid(grid, 1);
      if (nextGrid) {
        const nextButtons = Array.from(nextGrid.querySelectorAll(".emoji-button"));
        if (nextButtons.length) {
          targetButton = nextButtons[0];
        }
      }
    }
  } else if (key === "ArrowUp" || key === "ArrowDown") {
    const columns = getEmojiGridColumnCount(buttons);
    if (columns <= 0) return false;
    const columnIndex = currentIndex % columns;
    if (key === "ArrowUp") {
      const proposedIndex = currentIndex - columns;
      if (proposedIndex >= 0) {
        targetButton = buttons[proposedIndex];
      } else {
        const prevGrid = findAdjacentEmojiGrid(grid, -1);
        if (prevGrid) {
          targetButton = getAlignedButtonFromGrid(prevGrid, true, columnIndex);
        } else if (grid === firstVisibleGrid) {
          if (searchInput) {
            event.preventDefault();
            const valueLength = searchInput.value ? searchInput.value.length : 0;
            shouldRestoreEmojiFocus = false;
            searchInput.focus();
            if (typeof searchInput.setSelectionRange === "function") {
              searchInput.setSelectionRange(valueLength, valueLength);
            }
            return true;
          }
        }
      }
    } else {
      const proposedIndex = currentIndex + columns;
      if (proposedIndex < length) {
        targetButton = buttons[proposedIndex];
      } else {
        const lastRowStart = Math.floor((length - 1) / columns) * columns;
        const lastRowLength = length - lastRowStart;
        if (currentIndex < lastRowStart) {
          if (columnIndex < lastRowLength) {
            targetButton = buttons[lastRowStart + columnIndex];
          } else {
            targetButton = buttons[length - 1];
          }
        }
        if (!targetButton) {
          const nextGrid = findAdjacentEmojiGrid(grid, 1);
          if (nextGrid) {
            targetButton = getAlignedButtonFromGrid(nextGrid, false, columnIndex);
          }
        }
      }
    }
  } else if (key === "Home") {
    targetButton = buttons[0];
  } else if (key === "End") {
    targetButton = buttons[length - 1];
  }

  if (!targetButton) return false;

  event.preventDefault();
  setActiveEmojiButton(targetButton, { focus: true });
  return true;
}

function appendCharacterToSearch(key) {
  if (!searchInput || typeof key !== "string" || key.length === 0) return false;
  const nextValue = `${searchInput.value || ""}${key}`;
  searchInput.value = nextValue;
  focusSearchField(false);
  if (typeof searchInput.setSelectionRange === "function") {
    const length = nextValue.length;
    searchInput.setSelectionRange(length, length);
  }
  searchState.query = nextValue;
  applyFiltersAndRender();
  return true;
}

function removeLastCharacterFromSearch() {
  if (!searchInput) return false;
  const previousValue = searchInput.value || "";
  if (!previousValue.length) {
    focusSearchField(false);
    if (typeof searchInput.setSelectionRange === "function") {
      searchInput.setSelectionRange(0, 0);
    }
    return true;
  }
  const nextValue = Array.from(previousValue);
  nextValue.pop();
  const joined = nextValue.join("");
  searchInput.value = joined;
  focusSearchField(false);
  if (typeof searchInput.setSelectionRange === "function") {
    const length = joined.length;
    searchInput.setSelectionRange(length, length);
  }
  if (previousValue !== joined) {
    searchState.query = joined;
    applyFiltersAndRender();
  }
  return true;
}

function isLetterCharacterKey(key) {
  if (typeof key !== "string" || key.length !== 1) return false;
  const lower = key.toLowerCase();
  const upper = key.toUpperCase();
  return lower !== upper;
}

function isEditableTextElement(element) {
  if (!element) return false;
  if (element === searchInput) return true;
  if (element instanceof HTMLInputElement) {
    const type = typeof element.type === "string" ? element.type.toLowerCase() : "";
    if (!type || TEXT_ENTRY_INPUT_TYPES.has(type)) {
      return true;
    }
  } else if (element instanceof HTMLTextAreaElement) {
    return true;
  }
  if (typeof element.isContentEditable === "boolean" && element.isContentEditable) {
    return true;
  }
  return false;
}

function handleEmojiTypeToSearch(event) {
  if (!searchInput) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  const key = event.key;
  if (!key || key.length !== 1) return false;
  if (key === " ") return false;
  // Filter out non-printable characters.
  if (key < " " && key !== "\u0008") return false;
  shouldRestoreEmojiFocus = false;
  if (!appendCharacterToSearch(key)) {
    return false;
  }
  event.preventDefault();
  return true;
}

function maybeHandleGlobalSearchTyping(event) {
  if (!searchInput) return false;
  if (!event || typeof event.key !== "string") return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  const activeElement =
    document && document.activeElement ? document.activeElement : null;
  if (activeElement === categorySelect) return false;
  if (isEditableTextElement(activeElement)) return false;
  let handled = false;
  if (isLetterCharacterKey(event.key)) {
    shouldRestoreEmojiFocus = false;
    handled = appendCharacterToSearch(event.key);
  } else if (event.key === "Backspace") {
    shouldRestoreEmojiFocus = false;
    handled = removeLastCharacterFromSearch();
  }
  if (!handled) {
    return false;
  }
  event.preventDefault();
  return true;
}

function attachEmojiEventHandlers(button, emoji, categoryName) {
  button.dataset.emoji = emoji || "";
  button.dataset.section = categoryName || "";
  button.setAttribute("tabindex", "-1");

  button.addEventListener("focus", () => {
    setActiveEmojiButton(button);
    scheduleKeyboardTooltip(button);
  });

  button.addEventListener("blur", () => {
    if (keyboardTooltipTarget === button) {
      hideKeyboardTooltip();
    } else {
      cancelKeyboardTooltipTimer();
    }
  });

  button.addEventListener("keydown", (event) => {
    if (handleEmojiKeyNavigation(event, button)) {
      return;
    }
    if (handleEmojiTypeToSearch(event)) {
      return;
    }
  });

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
    shouldRestoreEmojiFocus = event.detail === 0;
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
  document.body.classList.add("settings-open");
  renderEmojiUsageTable();
  syncThemeControlsFromPreference();
}

function closeSettingsPanel() {
  if (!settingsOverlay) return;
  settingsOverlay.classList.add("settings-hidden");
  settingsOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("settings-open");
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
  hideKeyboardTooltip();
  categoriesEl.innerHTML = "";
  currentEmojiFocusButton = null;

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
    initializeEmojiKeyboardFocus();
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
    initializeEmojiKeyboardFocus();
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
    initializeEmojiKeyboardFocus();
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
    initializeEmojiKeyboardFocus();
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

  initializeEmojiKeyboardFocus();
}

let controlsInitialized = false;
let initialSearchFocusScheduled = false;

function handlePointerInteractionIntent() {
  lastInteractionWasKeyboard = false;
  hideKeyboardTooltip();
}

document.addEventListener(
  "pointerdown",
  () => {
    handlePointerInteractionIntent();
  },
  true
);

document.addEventListener(
  "mousedown",
  () => {
    handlePointerInteractionIntent();
  },
  true
);

document.addEventListener(
  "touchstart",
  () => {
    handlePointerInteractionIntent();
  },
  true
);

document.addEventListener(
  "keydown",
  () => {
    lastInteractionWasKeyboard = true;
  },
  true
);

function focusSearchField(selectText = true) {
  if (!searchInput) return false;
  searchInput.focus();
  if (selectText && typeof searchInput.select === "function") {
    searchInput.select();
  }
  return true;
}

function scheduleInitialSearchFocus() {
  if (initialSearchFocusScheduled) return;
  if (!searchInput) return;
  initialSearchFocusScheduled = true;

  const focusIfSafe = () => {
    if (!searchInput) return;
    const active = document && document.activeElement ? document.activeElement : null;
    const canTakeFocus =
      !active ||
      active === document.body ||
      active === document.documentElement ||
      active === searchInput;
    if (!canTakeFocus) {
      return;
    }
    focusSearchField(false);
  };

  const raf =
    typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame.bind(window)
      : null;

  if (raf) {
    raf(focusIfSafe);
  } else if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
    window.setTimeout(focusIfSafe, 0);
  } else if (typeof setTimeout === "function") {
    setTimeout(focusIfSafe, 0);
  } else {
    focusIfSafe();
  }
}

function clearSearchAndFocus() {
  if (!searchInput) return false;
  const previousValue = searchInput.value || "";
  const previousQuery = searchState.query || "";
  shouldRestoreEmojiFocus = false;
  if (previousValue.length > 0) {
    searchInput.value = "";
  } else if (document.activeElement !== searchInput) {
    searchInput.value = "";
  }
  if (typeof searchInput.setSelectionRange === "function") {
    searchInput.setSelectionRange(0, 0);
  }
  searchInput.focus();
  searchState.query = "";
  if (previousValue.length > 0 || previousQuery.length > 0) {
    applyFiltersAndRender();
  }
  return true;
}

function initControls() {
  if (controlsInitialized) return;
  controlsInitialized = true;

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      searchState.query = event.target.value || "";
      applyFiltersAndRender();
    });
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" && !event.altKey && !event.ctrlKey && !event.metaKey) {
        const valueLength = searchInput.value ? searchInput.value.length : 0;
        const caretAtEnd =
          typeof searchInput.selectionStart === "number" &&
          typeof searchInput.selectionEnd === "number" &&
          searchInput.selectionStart === searchInput.selectionEnd &&
          searchInput.selectionStart === valueLength;
        if (caretAtEnd) {
          const buttons = getVisibleEmojiButtons();
          if (buttons.length) {
            event.preventDefault();
            shouldRestoreEmojiFocus = false;
            setActiveEmojiButton(buttons[0], { focus: true });
          }
        }
      }
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
    hideKeyboardTooltip();
  });

  window.addEventListener(
    "scroll",
    () => {
      hideEmojiContextMenu();
      hideKeyboardTooltip();
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
    if (!event.defaultPrevented && maybeHandleGlobalSearchTyping(event)) {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
      const key = String(event.key).toLowerCase();
      if (key === "s") {
        const focused = focusSearchField();
        if (focused) {
          event.preventDefault();
          return;
        }
      } else if ((key === "w" || key === "q") && isRunningInTauri()) {
        event.preventDefault();
        requestTauriWindowClose();
        return;
      }
    }

    if (event.key === "Escape") {
      let prevented = false;
      if (settingsOverlay && !settingsOverlay.classList.contains("settings-hidden")) {
        event.preventDefault();
        prevented = true;
        closeSettingsPanel();
      } else {
        hideEmojiContextMenu();
      }
      const cleared = clearSearchAndFocus();
      if (cleared && !prevented) {
        event.preventDefault();
      }
    }
  });

  syncUsageSectionControls();
  scheduleInitialSearchFocus();
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
    await loadSlackEmojiNames();
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
  loadSlackEmojiNames,
  loadUsageFromStorage,
  persistUsage,
  schedulePersistUsage,
  resetUsageSaveTimerForTest,
  flushUsageSaveTimerForTest,
  getPinnedEmojisForCandidates,
  getFrequentEmojis,
  getRecentEmojis,
  getHiddenMatchesForCurrentFilters,
  filterCategories,
  getEmojiCategoryName,
  getEmojiUsageRows,
  renderEmojiUsageTable,
  resetAllUsageCounts,
  showEmojiContextMenu,
  hideEmojiContextMenu,
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
