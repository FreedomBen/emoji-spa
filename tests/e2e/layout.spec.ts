import { test, expect } from "@playwright/test";
import { waitForAppReady, SEL } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
});

test("header elements are present and visible", async ({ page }) => {
  await expect(page.locator(SEL.searchInput)).toBeVisible();
  await expect(page.locator(SEL.categorySelect)).toBeVisible();
  await expect(page.locator(SEL.groupByCategory)).toBeAttached();
  await expect(page.locator(SEL.settingsButton)).toBeVisible();
});

test("section ordering: base categories are alphabetical", async ({ page }) => {
  const headings = await page
    .locator(`${SEL.categories} h2`)
    .allTextContents();

  // Extract just the category name (strip count like " (123)").
  const names = headings.map((h) => h.replace(/\s*\(\d+\)$/, "").trim());
  expect(names.length).toBeGreaterThan(1);

  // Base categories should be sorted alphabetically.
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  expect(names).toEqual(sorted);
});

test("section ordering with pinned: Pinned comes first", async ({ page }) => {
  // Pin an emoji.
  const firstEmoji = page.locator(SEL.emojiButton).first();
  await firstEmoji.click({ button: "right" });
  await page.locator(`${SEL.contextMenu} [data-action="toggle-pin"]`).click();
  await page.waitForTimeout(200);

  const headings = await page
    .locator(`${SEL.categories} h2`)
    .allTextContents();
  const names = headings.map((h) => h.replace(/\s*\(\d+\)$/, "").trim());
  expect(names[0]).toBe("Pinned");
});

test("heading counts match actual emoji button counts", async ({ page }) => {
  const sections = page.locator(`${SEL.categories} section`);
  const count = await sections.count();

  for (let i = 0; i < count; i++) {
    const section = sections.nth(i);
    const heading = await section.locator("h2").textContent();
    const match = heading?.match(/\((\d+)\)/);
    if (!match) continue; // Skip sections without a count.

    const expected = parseInt(match[1], 10);
    const actual = await section.locator(SEL.emojiButton).count();
    expect(actual).toBe(expected);
  }
});

test("hidden section uses details/summary and starts collapsed", async ({ page }) => {
  // Hide an emoji first.
  const firstEmoji = page.locator(SEL.emojiButton).first();
  await firstEmoji.click({ button: "right" });
  await page.locator(`${SEL.contextMenu} [data-action="toggle-hide"]`).click();
  await page.waitForTimeout(200);

  const details = page.locator("details.emoji-hidden-section");
  await expect(details).toBeAttached();

  // Should start collapsed (no "open" attribute).
  const isOpen = await details.getAttribute("open");
  expect(isOpen).toBeNull();

  // Click summary to expand.
  await details.locator("summary").click();
  await expect(details).toHaveAttribute("open", "");
});

test("dark theme renders without layout breakage", async ({ page }) => {
  // Dark is default, check no horizontal overflow.
  const overflowX = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(overflowX).toBe(false);
});

test("light theme renders without layout breakage", async ({ page }) => {
  // Switch to light theme via settings.
  await page.locator(SEL.settingsButton).click();
  await page.locator('input[name="themePreference"][value="light"]').click();
  await page.locator(SEL.closeSettingsButton).click();
  await page.waitForTimeout(100);

  const overflowX = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(overflowX).toBe(false);
});
