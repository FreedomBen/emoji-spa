import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as app from "../frontend/app.js";
import { resetAppState } from "./test-utils.js";

const {
  showEmojiContextMenu,
  hideEmojiContextMenu,
  initControls,
  pinnedEmojis,
  hiddenEmojis,
  emojiUsage
} = app;

describe("emoji context menu", () => {
  beforeEach(() => {
    resetAppState();
    initControls();
  });

  afterEach(() => {
    hideEmojiContextMenu();
  });

  it("updates labels and clamps position within the viewport", () => {
    pinnedEmojis.add("😀");
    hiddenEmojis.delete("😀");

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      clientX: viewportWidth + 100,
      clientY: viewportHeight + 100
    };

    showEmojiContextMenu(event, "😀", "Smileys & Emotion");

    const menu = document.getElementById("emojiContextMenu");
    expect(menu).toBeTruthy();
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(false);

    const pinButton = menu.querySelector('[data-action="toggle-pin"]');
    const hideButton = menu.querySelector('[data-action="toggle-hide"]');
    expect(pinButton.textContent).toBe("Unpin");
    expect(hideButton.textContent).toBe("Hide");

    const expectedLeft = Math.max(8, viewportWidth - 160 - 8);
    const expectedTop = Math.max(8, viewportHeight - 100 - 8);
    expect(menu.style.left).toBe(`${expectedLeft}px`);
    expect(menu.style.top).toBe(`${expectedTop}px`);
  });

  it("performs toggle and reset actions from context menu buttons", () => {
    const renderSpy = vi.spyOn(app, "applyFiltersAndRender").mockImplementation(() => {});
    const scheduleSpy = vi.spyOn(app, "schedulePersistUsage").mockImplementation(() => {});

    const menu = document.getElementById("emojiContextMenu");
    expect(menu).toBeTruthy();
    const pinButton = menu.querySelector('[data-action="toggle-pin"]');
    const hideButton = menu.querySelector('[data-action="toggle-hide"]');
    const resetButton = menu.querySelector('[data-action="reset-usage"]');

    showEmojiContextMenu(
      {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        clientX: 10,
        clientY: 10
      },
      "😀",
      "Smileys & Emotion"
    );

    pinButton.click();
    expect(pinnedEmojis.has("😀")).toBe(true);
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(true);

    showEmojiContextMenu(
      {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        clientX: 10,
        clientY: 10
      },
      "😀",
      "Smileys & Emotion"
    );

    hideButton.click();
    expect(hiddenEmojis.has("😀")).toBe(true);
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(true);

    emojiUsage.set("😀", { count: 4, lastUsed: 123 });

    showEmojiContextMenu(
      {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        clientX: 10,
        clientY: 10
      },
      "😀",
      "Smileys & Emotion"
    );

    resetButton.click();
    expect(emojiUsage.has("😀")).toBe(false);
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(true);

    renderSpy.mockRestore();
    scheduleSpy.mockRestore();
  });
});
