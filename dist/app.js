import { EMOJI_METADATA } from "./emoji-data.js";

const statusEl = document.getElementById("status");
const categoriesEl = document.getElementById("categories");
const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const groupByCategoryCheckbox = document.getElementById("groupByCategory");
const contextMenuEl = document.getElementById("emojiContextMenu");

let emojiRegex = null;
let allCategories = null;
const metadataByEmoji = new Map();

for (const entry of EMOJI_METADATA) {
  if (entry && entry.emoji) {
    metadataByEmoji.set(entry.emoji, entry);
  }
}

const USAGE_STORAGE_KEY = "emojiUsage.v1";
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
        const keywords = [
          ...(existing.keywords || []),
          ...(Array.isArray(entry.keywords) ? entry.keywords : [])
        ];
        metadataByEmoji.set(emoji, { emoji, name, keywords });
      }
    } else if (data && typeof data === "object") {
      for (const [emoji, value] of Object.entries(data)) {
        if (!emoji || !value) continue;
        const existing = metadataByEmoji.get(emoji) || {};
        const name = value.name || existing.name;
        const keywords = [
          ...(existing.keywords || []),
          ...(Array.isArray(value.keywords) ? value.keywords : [])
        ];
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
      hidden: Array.from(hiddenEmojis)
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

function countHiddenMatchesForCurrentFilters() {
  if (!allCategories || !hiddenEmojis.size) return 0;

  const query = searchState.query.trim().toLowerCase();
  const tokens = query ? query.split(/\s+/).filter(Boolean) : [];
  const selectedCategory = searchState.category;

  let count = 0;

  for (const emoji of hiddenEmojis) {
    if (!emoji) continue;

    const cp = emoji.codePointAt(0);
    const categoryName = cp != null ? getCategory(cp) : "Other Emoji";

    if (selectedCategory !== "all" && categoryName !== selectedCategory) {
      continue;
    }

    if (!tokens.length) {
      count++;
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
      count++;
    }
  }

  return count;
}

function initEmojiRegex() {
  try {
    // Use Unicode property escapes if available to detect emoji code points.
    emojiRegex = /\p{Emoji}/u;
  } catch {
    emojiRegex = null;
  }
}

const searchState = {
  query: "",
  category: "all",
  groupByCategory: true
};

function isEmoji(char) {
  if (!char) return false;
  if (emojiRegex) {
    return emojiRegex.test(char);
  }
  // Fallback heuristic for environments without Unicode property escapes.
  const cp = char.codePointAt(0);
  if (cp === undefined) return false;
  if (
    (cp >= 0x1f300 && cp <= 0x1ffff) ||
    (cp >= 0x2600 && cp <= 0x26ff) ||
    (cp >= 0x2700 && cp <= 0x27bf)
  ) {
    return true;
  }
  return false;
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

function generateEmojiByCategory() {
  const categories = new Map();
  const maxCodePoint = 0x10ffff;

  for (let cp = 0; cp <= maxCodePoint; cp++) {
    const char = String.fromCodePoint(cp);
    if (!isEmoji(char)) continue;

    // Filter out variation selectors and combining marks commonly used with emoji.
    if (cp === 0xfe0f || cp === 0x20e3) continue;

    const category = getCategory(cp);
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
        button.addEventListener("click", () => copyEmoji(emoji));
        button.addEventListener("contextmenu", (event) =>
          handleEmojiContextMenu(event, emoji, name)
        );
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
        button.addEventListener("click", () => copyEmoji(emoji));
        button.addEventListener("contextmenu", (event) =>
          handleEmojiContextMenu(event, emoji, name)
        );
        grid.appendChild(button);
      }
    }

    section.appendChild(grid);
    categoriesEl.appendChild(section);
  }
}

function getEmojiTitle(emoji, categoryName) {
  const meta = metadataByEmoji.get(emoji);
  if (meta && meta.name) {
    return `${emoji} — ${meta.name}`;
  }
  if (categoryName) {
    return `${emoji} — ${categoryName}`;
  }
  return emoji;
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
    button.addEventListener("click", () => copyEmoji(emoji));
     button.addEventListener("contextmenu", (event) =>
       handleEmojiContextMenu(event, emoji, title)
     );
    grid.appendChild(button);
  }

  section.appendChild(grid);
  categoriesEl.appendChild(section);
}

function renderHiddenSection() {
  if (!hiddenEmojis.size) return;

  const section = document.createElement("section");
  const details = document.createElement("details");
  details.className = "emoji-hidden-section";

  const summary = document.createElement("summary");
  summary.textContent = `Hidden (${hiddenEmojis.size})`;
  details.appendChild(summary);

  const grid = document.createElement("div");
  grid.className = "emoji-grid";

  for (const emoji of hiddenEmojis) {
    const button = document.createElement("button");
    button.className = "emoji-button";
    button.textContent = emoji;
    button.title = getEmojiTitle(emoji, "Hidden");
    button.addEventListener("click", () => copyEmoji(emoji));
    button.addEventListener("contextmenu", (event) =>
      handleEmojiContextMenu(event, emoji, "Hidden")
    );
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
  const selectedCategory = searchState.category;
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

function populateCategorySelect(categories) {
  if (!categorySelect) return;

  // Keep the "All categories" option.
  const seen = new Set(["all"]);
  for (const [name] of categories.entries()) {
    if (seen.has(name)) continue;
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    categorySelect.appendChild(option);
    seen.add(name);
  }
}

function applyFiltersAndRender() {
  const filtered = filterCategories();
  categoriesEl.innerHTML = "";

  lastHiddenMatches = countHiddenMatchesForCurrentFilters();

  // Build the set of emojis that are part of the current filtered result.
  const candidateSet = new Set();
  for (const emojis of filtered.values()) {
    for (const emoji of emojis) {
      candidateSet.add(emoji);
    }
  }

  if (candidateSet.size > 0) {
    // Pinned section: always first, but restricted to emojis that are part of
    // the current filtered result (search/category-aware).
    const pinnedForView = getPinnedEmojisForCandidates(candidateSet);
    if (pinnedForView.length) {
      renderSpecialSection("Pinned", pinnedForView);
    }

    // Frequently Used section: only include emojis that are also in the
    // current filtered result (so category/search filters are respected).
    const frequentAll = getFrequentEmojis();
    const frequentEmojis = frequentAll.filter((emoji) => candidateSet.has(emoji));
    if (frequentEmojis.length) {
      renderSpecialSection("Frequently Used", frequentEmojis);
    }

    // Recently Used section: same restriction, but allow overlap with
    // Frequently Used (duplicates across sections are fine).
    const recentAll = getRecentEmojis();
    const recentEmojis = recentAll.filter((emoji) => candidateSet.has(emoji));
    if (recentEmojis.length) {
      renderSpecialSection("Recently Used", recentEmojis);
    }
  }

  renderCategories(filtered, searchState.groupByCategory);
  const hasQuery = searchState.query.trim().length > 0;
  if (!hasQuery || lastHiddenMatches > 0) {
    renderHiddenSection();
  }
}

function initControls() {
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
      applyFiltersAndRender();
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
         // To be implemented in a future step.
         console.log("Reset usage (not yet implemented):", contextMenuEmoji);
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
}

function init() {
  initEmojiRegex();
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
