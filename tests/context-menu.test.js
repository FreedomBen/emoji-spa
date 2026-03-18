import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as app from "../frontend/app.js";
import { resetAppState } from "./test-utils.js";

const {
  showEmojiContextMenu,
  hideEmojiContextMenu,
  initControls,
  pinnedEmojis,
  hiddenEmojis,
  emojiUsage,
  setAllCategoriesForTest,
  applyFiltersAndRender,
  searchState,
  copyEmoji
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

  it("closes menu when clicking outside", () => {
    showEmojiContextMenu(
      { preventDefault: vi.fn(), stopPropagation: vi.fn(), clientX: 50, clientY: 50 },
      "😀",
      "Smileys & Emotion"
    );

    const menu = document.getElementById("emojiContextMenu");
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(false);

    // Click on the document body (outside the menu).
    document.body.click();
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(true);
  });

  it("closes menu on window scroll", () => {
    showEmojiContextMenu(
      { preventDefault: vi.fn(), stopPropagation: vi.fn(), clientX: 50, clientY: 50 },
      "😀",
      "Smileys & Emotion"
    );

    const menu = document.getElementById("emojiContextMenu");
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(false);

    // The scroll listener is registered with `true` (capture), so dispatch on window.
    window.dispatchEvent(new Event("scroll"));
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(true);
  });

  it("closes menu on window resize", () => {
    showEmojiContextMenu(
      { preventDefault: vi.fn(), stopPropagation: vi.fn(), clientX: 50, clientY: 50 },
      "😀",
      "Smileys & Emotion"
    );

    const menu = document.getElementById("emojiContextMenu");
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(false);

    window.dispatchEvent(new Event("resize"));
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(true);
  });
});

describe("emoji long-press (touch)", () => {
  let renderSpy;
  let scheduleSpy;

  beforeEach(() => {
    resetAppState();
    initControls();
    renderSpy = vi.spyOn(app, "applyFiltersAndRender").mockImplementation(() => {});
    scheduleSpy = vi.spyOn(app, "schedulePersistUsage").mockImplementation(() => {});

    // Render emoji buttons into the DOM so event handlers are attached.
    setAllCategoriesForTest(new Map([["Smileys & Emotion", ["😀"]]]));
    renderSpy.mockRestore();
    applyFiltersAndRender();
    renderSpy = vi.spyOn(app, "applyFiltersAndRender").mockImplementation(() => {});
  });

  afterEach(() => {
    hideEmojiContextMenu();
    renderSpy.mockRestore();
    scheduleSpy.mockRestore();
    vi.useRealTimers();
  });

  function getEmojiButton(emoji) {
    const buttons = document.querySelectorAll("#categories button");
    for (const btn of buttons) {
      if (btn.textContent.trim() === emoji || btn.dataset.emoji === emoji) return btn;
    }
    return null;
  }

  function touchPointerEvent(type, opts = {}) {
    // jsdom doesn't define PointerEvent, so fall back to a CustomEvent with
    // the pointer-specific properties mixed in.
    const Ctor = typeof PointerEvent !== "undefined" ? PointerEvent : Event;
    const event = new Ctor(type, {
      bubbles: true,
      cancelable: true,
      ...opts
    });
    // Ensure pointer-specific properties are readable.
    if (!event.pointerType) {
      Object.defineProperty(event, "pointerType", {
        value: opts.pointerType || "touch"
      });
    }
    if (event.clientX == null) {
      Object.defineProperty(event, "clientX", { value: opts.clientX || 50 });
      Object.defineProperty(event, "clientY", { value: opts.clientY || 50 });
    }
    // Add preventDefault/stopPropagation stubs that showEmojiContextMenu expects.
    if (!event.preventDefault || Ctor === Event) {
      const origPreventDefault = event.preventDefault.bind(event);
      event.preventDefault = vi.fn(origPreventDefault);
    }
    if (!event.stopPropagation || Ctor === Event) {
      const origStopPropagation = event.stopPropagation.bind(event);
      event.stopPropagation = vi.fn(origStopPropagation);
    }
    return event;
  }

  it("long-press opens context menu and suppresses click", () => {
    vi.useFakeTimers();
    const button = getEmojiButton("😀");
    expect(button).toBeTruthy();

    const menu = document.getElementById("emojiContextMenu");

    // Start the long-press.
    button.dispatchEvent(touchPointerEvent("pointerdown"));
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(true);

    // Advance past the 500ms threshold.
    vi.advanceTimersByTime(501);
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(false);

    // Release — the subsequent click should be suppressed.
    button.dispatchEvent(touchPointerEvent("pointerup"));
    const copySpy = vi.spyOn(app, "copyEmoji").mockImplementation(() => {});
    button.click();
    expect(copySpy).not.toHaveBeenCalled();
    copySpy.mockRestore();
  });

  it("brief tap copies emoji without opening context menu", async () => {
    vi.useFakeTimers();
    const button = getEmojiButton("😀");
    expect(button).toBeTruthy();

    const menu = document.getElementById("emojiContextMenu");

    // Mock clipboard to avoid errors.
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true
    });

    // Start press, release quickly (< 500ms).
    button.dispatchEvent(touchPointerEvent("pointerdown"));
    vi.advanceTimersByTime(100);
    button.dispatchEvent(touchPointerEvent("pointerup"));

    // Context menu should not have opened.
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(true);

    // Click fires and copies.
    button.click();
    // Allow the async copyEmoji to resolve.
    await vi.advanceTimersByTimeAsync(0);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("😀");

    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true
    });
  });

  it("pointerup before threshold cancels the long-press", () => {
    vi.useFakeTimers();
    const button = getEmojiButton("😀");
    const menu = document.getElementById("emojiContextMenu");

    button.dispatchEvent(touchPointerEvent("pointerdown"));
    vi.advanceTimersByTime(200);
    button.dispatchEvent(touchPointerEvent("pointerup"));

    // Now advance past the original threshold — menu should still not open.
    vi.advanceTimersByTime(400);
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(true);
  });

  it("pointercancel before threshold cancels the long-press", () => {
    vi.useFakeTimers();
    const button = getEmojiButton("😀");
    const menu = document.getElementById("emojiContextMenu");

    button.dispatchEvent(touchPointerEvent("pointerdown"));
    vi.advanceTimersByTime(200);
    button.dispatchEvent(touchPointerEvent("pointercancel"));

    vi.advanceTimersByTime(400);
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(true);
  });

  it("pointerleave before threshold cancels the long-press", () => {
    vi.useFakeTimers();
    const button = getEmojiButton("😀");
    const menu = document.getElementById("emojiContextMenu");

    button.dispatchEvent(touchPointerEvent("pointerdown"));
    vi.advanceTimersByTime(200);
    button.dispatchEvent(touchPointerEvent("pointerleave"));

    vi.advanceTimersByTime(400);
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(true);
  });

  it("mouse pointerdown does not trigger long-press timer", () => {
    vi.useFakeTimers();
    const button = getEmojiButton("😀");
    const menu = document.getElementById("emojiContextMenu");

    const mouseEvent = touchPointerEvent("pointerdown", { pointerType: "mouse" });
    button.dispatchEvent(mouseEvent);

    vi.advanceTimersByTime(600);
    expect(menu.classList.contains("emoji-context-menu-hidden")).toBe(true);
  });
});
