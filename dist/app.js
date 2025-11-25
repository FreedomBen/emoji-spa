const statusEl = document.getElementById("status");
const categoriesEl = document.getElementById("categories");

let emojiRegex = null;

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

function renderCategories(categories) {
  categoriesEl.innerHTML = "";

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
}

function setStatus(text) {
  if (statusEl) {
    statusEl.textContent = text;
  }
}

function init() {
  initEmojiRegex();
  setStatus("Generating emoji list...");

  // Yield to the UI thread before heavy work.
  setTimeout(() => {
    const categories = generateEmojiByCategory();
    renderCategories(categories);
    setStatus("Click an emoji to copy it to the clipboard.");
  }, 10);
}

document.addEventListener("DOMContentLoaded", init);

