import { EMOJI_METADATA } from "./emoji-data.js";

const statusEl = document.getElementById("status");
const categoriesEl = document.getElementById("categories");
const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const groupByCategoryCheckbox = document.getElementById("groupByCategory");

let emojiRegex = null;
let allCategories = null;
const metadataByEmoji = new Map();

for (const entry of EMOJI_METADATA) {
  if (entry && entry.emoji) {
    metadataByEmoji.set(entry.emoji, entry);
  }
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

const searchState = {
  query: "",
  category: "all",
  groupByCategory: true
};

function initEmojiRegex() {
  try {
    // Use Unicode property escapes if available to detect emoji code points.
    emojiRegex = /\p{Emoji}/u;
  } catch {
    emojiRegex = null;
  }
}

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
  categoriesEl.innerHTML = "";

  if (!categories || categories.size === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No emoji match your current filters.";
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
        button.title = emoji;
        button.addEventListener("click", () => copyEmoji(emoji));
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
        button.title = `${emoji} — ${name}`;
        button.addEventListener("click", () => copyEmoji(emoji));
        grid.appendChild(button);
      }
    }

    section.appendChild(grid);
    categoriesEl.appendChild(section);
  }
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
  renderCategories(filtered, searchState.groupByCategory);
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
}

function init() {
  initEmojiRegex();
  initControls();
  setStatus("Generating emoji list...");

  // Yield to the UI thread before heavy work.
  setTimeout(() => {
    allCategories = generateEmojiByCategory();
    populateCategorySelect(allCategories);
    applyFiltersAndRender();
    setStatus("Use the search and filters above, then click an emoji to copy it to the clipboard.");
  }, 10);
}

document.addEventListener("DOMContentLoaded", init);
