import { test, expect } from "@playwright/test";
import { waitForAppReady, SEL } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
});

test("clicking an emoji copies it to the clipboard", async ({ page }) => {
  const firstEmoji = page.locator(SEL.emojiButton).first();
  const emojiChar = (await firstEmoji.textContent())!.trim();

  await firstEmoji.click();

  const clipboardText = await page.evaluate(() =>
    navigator.clipboard.readText()
  );
  expect(clipboardText).toBe(emojiChar);
});

test("status message shows copied confirmation", async ({ page }) => {
  const firstEmoji = page.locator(SEL.emojiButton).first();
  await firstEmoji.click();

  const status = page.locator("#status");
  const text = await status.textContent();
  expect(text!.toLowerCase()).toContain("copied");
});

test("paste copied emoji into search input via keyboard", async ({ page }) => {
  const firstEmoji = page.locator(SEL.emojiButton).first();
  const emojiChar = (await firstEmoji.textContent())!.trim();

  await firstEmoji.click();

  // Focus search input and paste.
  const searchInput = page.locator(SEL.searchInput);
  await searchInput.focus();
  await searchInput.press("ControlOrMeta+v");

  const value = await searchInput.inputValue();
  expect(value).toContain(emojiChar);
});
