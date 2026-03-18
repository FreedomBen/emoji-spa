import { test, expect } from "@playwright/test";
import { waitForAppReady, SEL } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
});

test("right-click shows custom context menu and suppresses default", async ({ page }) => {
  const firstEmoji = page.locator(SEL.emojiButton).first();

  // Listen for the native contextmenu event — it should be prevented.
  const defaultPrevented = await firstEmoji.evaluate((el) => {
    return new Promise<boolean>((resolve) => {
      el.addEventListener(
        "contextmenu",
        (e) => resolve(e.defaultPrevented),
        { once: true, capture: false }
      );
      el.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
      );
    });
  });
  expect(defaultPrevented).toBe(true);

  // Custom menu should now be visible (not have the hidden class).
  const menu = page.locator(SEL.contextMenu);
  await expect(menu).not.toHaveClass(/emoji-context-menu-hidden/);
});

test("context menu shows correct Pin/Unpin label", async ({ page }) => {
  const firstEmoji = page.locator(SEL.emojiButton).first();
  await firstEmoji.click({ button: "right" });

  const pinButton = page.locator(`${SEL.contextMenu} [data-action="toggle-pin"]`);
  await expect(pinButton).toHaveText("Pin");

  // Pin it.
  await pinButton.click();
  await page.waitForTimeout(100);

  // Right-click again — label should now be "Unpin".
  const emojiButtons = page.locator(SEL.emojiButton);
  await emojiButtons.first().click({ button: "right" });
  await expect(
    page.locator(`${SEL.contextMenu} [data-action="toggle-pin"]`)
  ).toHaveText("Unpin");
});

test("context menu shows correct Hide/Unhide label", async ({ page }) => {
  const firstEmoji = page.locator(SEL.emojiButton).first();
  await firstEmoji.click({ button: "right" });

  const hideButton = page.locator(`${SEL.contextMenu} [data-action="toggle-hide"]`);
  await expect(hideButton).toHaveText("Hide");
});

test("clicking outside dismisses the context menu", async ({ page }) => {
  const firstEmoji = page.locator(SEL.emojiButton).first();
  await firstEmoji.click({ button: "right" });

  const menu = page.locator(SEL.contextMenu);
  await expect(menu).not.toHaveClass(/emoji-context-menu-hidden/);

  // Click on the body to dismiss.
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await expect(menu).toHaveClass(/emoji-context-menu-hidden/);
});

test("pin via menu makes emoji appear in Pinned section", async ({ page }) => {
  const firstEmoji = page.locator(SEL.emojiButton).first();
  const emojiChar = await firstEmoji.textContent();
  await firstEmoji.click({ button: "right" });
  await page.locator(`${SEL.contextMenu} [data-action="toggle-pin"]`).click();
  await page.waitForTimeout(200);

  // A "Pinned" heading should now exist.
  const pinnedHeading = page.locator(`${SEL.categories} h2`, {
    hasText: /^Pinned/,
  });
  await expect(pinnedHeading).toBeVisible();

  // The pinned emoji should be in its grid.
  const pinnedSection = pinnedHeading.locator("xpath=ancestor::section[1]");
  const pinnedEmojis = await pinnedSection
    .locator(SEL.emojiButton)
    .allTextContents();
  expect(pinnedEmojis).toContain(emojiChar!.trim());
});

test("hide via menu moves emoji to Hidden section", async ({ page }) => {
  const firstEmoji = page.locator(SEL.emojiButton).first();
  const emojiChar = await firstEmoji.textContent();
  await firstEmoji.click({ button: "right" });
  await page.locator(`${SEL.contextMenu} [data-action="toggle-hide"]`).click();
  await page.waitForTimeout(200);

  // Hidden section should exist as a <details> element.
  const hiddenDetails = page.locator("details.emoji-hidden-section");
  await expect(hiddenDetails).toBeVisible();

  // Expand it and check the emoji is there.
  await hiddenDetails.locator("summary").click();
  const hiddenEmojis = await hiddenDetails
    .locator(SEL.emojiButton)
    .allTextContents();
  expect(hiddenEmojis).toContain(emojiChar!.trim());
});
