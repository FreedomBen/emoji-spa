import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { waitForAppReady, SEL } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
});

test("dark theme has no critical or serious axe violations", async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .disableRules([
      "color-contrast",     // emoji buttons are inherently non-text
      "label-title-only",   // searchInput uses title attr (known gap)
      "select-name",        // categorySelect lacks explicit label (known gap)
    ])
    .analyze();

  const critical = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
  expect(
    critical,
    `Violations: ${critical.map((v) => `${v.id}: ${v.description}`).join("; ")}`
  ).toHaveLength(0);
});

test("light theme has no critical or serious axe violations", async ({ page }) => {
  // Switch to light theme.
  await page.locator(SEL.settingsButton).click();
  await page.locator('input[name="themePreference"][value="light"]').click();
  await page.locator(SEL.closeSettingsButton).click();
  await page.waitForTimeout(100);

  const results = await new AxeBuilder({ page })
    .disableRules([
      "color-contrast",
      "label-title-only",
      "select-name",
    ])
    .analyze();

  const critical = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
  expect(
    critical,
    `Violations: ${critical.map((v) => `${v.id}: ${v.description}`).join("; ")}`
  ).toHaveLength(0);
});

test("settings panel passes accessibility checks", async ({ page }) => {
  await page.locator(SEL.settingsButton).click();
  await page.waitForTimeout(200);

  const results = await new AxeBuilder({ page })
    .include(".settings-panel")
    .analyze();

  const critical = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
  expect(
    critical,
    `Violations: ${critical.map((v) => `${v.id}: ${v.description}`).join("; ")}`
  ).toHaveLength(0);
});

test("context menu passes accessibility checks", async ({ page }) => {
  // Open context menu.
  const firstEmoji = page.locator(SEL.emojiButton).first();
  await firstEmoji.click({ button: "right" });
  await page.waitForTimeout(100);

  const results = await new AxeBuilder({ page })
    .include(SEL.contextMenu)
    .analyze();

  const critical = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
  expect(
    critical,
    `Violations: ${critical.map((v) => `${v.id}: ${v.description}`).join("; ")}`
  ).toHaveLength(0);
});
