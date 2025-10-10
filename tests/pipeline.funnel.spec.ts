import { expect, test } from "@playwright/test";
import path from "path";
import { pathToFileURL } from "url";

const fileUrl = pathToFileURL(path.join(__dirname, "..", "index.html")).toString();

test.describe("Pipeline funnel section", () => {
  test("renders content and syncs interactions", async ({ page }) => {
    await page.goto(fileUrl);

    const section = page.locator("#pipeline");
    await expect(section).toBeVisible();
    await expect(section.locator("h2#pipeline-heading")).toHaveText("How your pipeline will look with Belkins");
    await expect(section.locator(".pipeline__sub")).toHaveText(
      "Focus on scaling your business while we deliver you sales-ready B2B leads."
    );
    await expect(section.locator(".pipeline__caption")).toHaveText(
      "* Average yearly outcomes. The results depend on multiple factors."
    );

    const activationTab = section.getByRole("tab", { name: "Activation" });
    await activationTab.click();
    await expect(activationTab).toHaveAttribute("aria-selected", "true");
    await expect(section.locator("#panel-activation")).toBeVisible();
    await expect(section.locator("#panel-omni")).toBeHidden();

    const layers = section.locator(".funnel__layer");
    await expect(layers.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(layers.first()).toHaveAttribute("aria-pressed", "false");
    await expect(layers.nth(2)).toHaveAttribute("aria-pressed", "false");
    await expect(layers.nth(3)).toHaveAttribute("aria-pressed", "false");

    const firstTab = section.getByRole("tab", { name: "Omnichannel engagement" });
    await firstTab.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    const conversionTab = section.getByRole("tab", { name: "Conversion" });
    await expect(conversionTab).toHaveAttribute("aria-selected", "true");
    await expect(section.locator("#panel-conversion")).toBeVisible();

    const dealsLayer = section.getByRole("button", { name: /Opportunities — 10–30\* closed deals/i });
    await dealsLayer.click();
    const dealClosureTab = section.getByRole("tab", { name: "Deal closure" });
    await expect(dealClosureTab).toHaveAttribute("aria-selected", "true");
    await expect(section.locator("#panel-deal")).toBeVisible();
  });

  test("remains compact across breakpoints", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 720 });
    await page.goto(fileUrl);
    const section = page.locator("#pipeline");
    await expect(section).toBeVisible();
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 1;
    });
    expect(hasHorizontalScroll).toBeFalsy();

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(fileUrl);
    const sectionHeight = await section.evaluate((node) => node.getBoundingClientRect().height);
    expect(sectionHeight).toBeLessThan(680);
  });
});
