import { type Page } from "@playwright/test";

/** Wait until emoji buttons are rendered (app init has a short delay). */
export async function waitForAppReady(page: Page) {
  await page.locator(".emoji-button").first().waitFor({ timeout: 15_000 });
}

/** Common selectors used across E2E tests. */
export const SEL = {
  searchInput: "#searchInput",
  categorySelect: "#categorySelect",
  groupByCategory: "#groupByCategory",
  settingsButton: "#settingsButton",
  settingsOverlay: "#settingsOverlay",
  closeSettingsButton: "#closeSettingsButton",
  contextMenu: "#emojiContextMenu",
  categories: "#categories",
  emojiButton: ".emoji-button",
  sectionHeading: ".emoji-category-heading",
  hiddenDetails: "details.hidden-section",
} as const;
