import { expect, test } from "@playwright/test";
import path from "path";
import { pathToFileURL } from "url";

const fileUrl = pathToFileURL(path.join(__dirname, "..", "docs", "index.html")).toString();

const cardData = [
  {
    title: "Tailored omnichannel strategies",
    image:
      "https://res.cloudinary.com/diptffkzh/image/upload/v1760183048/tailored-omnichannel-strategies.DnUZGnlx_cbbrim.webp",
    description:
      "Unlike other agencies’ cookie-cutter approaches, we craft personalized go-to-market plans that align perfectly with your unique business objectives and integrate both outbound and inbound efforts.",
  },
  {
    title: "World-class talent",
    image: "https://res.cloudinary.com/diptffkzh/image/upload/v1760183048/world-class-talent.Bj5AP60s_q1qsny.webp",
    description:
      "We carefully select teams to work on your project and to act as an extension of your own. Rest assured, you’ll get dedicated specialists with narrow industry knowledge, relevant certifications, and dozens of successful cases.",
  },
  {
    title: "The first results within a month",
    image: "https://res.cloudinary.com/diptffkzh/image/upload/v1760183047/first-results-within-month.CZkWujlE_gdymaa.webp",
    description:
      "We set up and launch your campaign in the first 14 days. Within the next 30 days, you’ll start seeing the first appointments in your calendar.",
  },
  {
    title: "B2B-focused expertise",
    image: "https://res.cloudinary.com/diptffkzh/image/upload/v1760183047/b2b-focused-expertise.WCKyBRCN_i3oqmb.webp",
    description:
      "Our deep understanding of the B2B landscape empowers us to use the right cutting-edge tools and deliver targeted, result-oriented outbound solutions that last even if we part ways.",
  },
  {
    title: "Cross-functional approach",
    image: "https://res.cloudinary.com/diptffkzh/image/upload/v1760183047/cross-functional-approach.D0BzI-D5_ndwueh.webp",
    description:
      "Our end-to-end strategy and implementation support cover every stage of the deal generation process, from inbound lead gen to strategy consulting, minimizing risks and raising sales by 25% on average.",
  },
];

test.describe("What sets us apart section", () => {
  test("renders header, CTA, and rich cards", async ({ page }) => {
    await page.goto(fileUrl);

    const section = page.locator("#sets-apart");
    await expect(section).toBeVisible();
    await expect(section.locator("h2#sets-apart-heading")).toHaveText("What sets us apart");
    await expect(section.locator(".sets-apart__intro")).toContainText(
      "Since 2017, Direct Sales Network® has been the top outbound lead generation agency"
    );

    const cta = section.getByRole("link", { name: "Get a quote" });
    await expect(cta).toBeVisible();

    const cards = section.locator("article.sets-apart__card");
    await expect(cards).toHaveCount(cardData.length);

    for (const [index, card] of cardData.entries()) {
      const locator = cards.nth(index);
      await expect(locator.locator("h3")).toHaveText(card.title);
      await expect(locator.locator("p")).toHaveText(card.description);

      const image = locator.locator("img");
      await expect(image).toHaveAttribute("src", card.image);
      await expect(image).toHaveAttribute("alt", card.title);
      await expect(image).toHaveAttribute("loading", "lazy");
      await expect(image).toHaveAttribute("decoding", "async");
      await expect(image).toHaveAttribute("width", "640");
      await expect(image).toHaveAttribute("height", "360");
    }
  });

  test("adapts layout across breakpoints without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 720 });
    await page.goto(fileUrl);

    const grid = page.locator("#sets-apart .sets-apart__grid");
    const mobileColumns = await grid.evaluate((node) => {
      const value = getComputedStyle(node).gridTemplateColumns;
      return value === "none" ? 0 : value.split(")").filter(Boolean).length;
    });
    expect(mobileColumns).toBe(1);

    const noHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth + 1;
    });
    expect(noHorizontalScroll).toBeTruthy();

    await page.setViewportSize({ width: 768, height: 720 });
    await page.goto(fileUrl);
    const tabletColumns = await grid.evaluate((node) => {
      const value = getComputedStyle(node).gridTemplateColumns;
      return value.split(")").filter(Boolean).length;
    });
    expect(tabletColumns).toBe(2);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(fileUrl);
    const desktopColumns = await grid.evaluate((node) => {
      const value = getComputedStyle(node).gridTemplateColumns;
      return value.split(")").filter(Boolean).length;
    });
    expect(desktopColumns).toBeGreaterThanOrEqual(3);

    const cards = page.locator("#sets-apart .sets-apart__card");
    const firstWidth = await cards.first().evaluate((node) => node.getBoundingClientRect().width);
    const otherWidth = await cards.nth(1).evaluate((node) => node.getBoundingClientRect().width);
    expect(firstWidth).toBeGreaterThan(otherWidth * 1.6);

    const firstHeight = await cards.first().evaluate((node) => node.getBoundingClientRect().height);
    const otherHeight = await cards.nth(1).evaluate((node) => node.getBoundingClientRect().height);
    expect(firstHeight).toBeGreaterThan(otherHeight * 1.2);
  });
});
