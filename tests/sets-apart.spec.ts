import { expect, test } from "@playwright/test";
import path from "path";
import { pathToFileURL } from "url";

const fileUrl = pathToFileURL(path.join(__dirname, "..", "index.html")).toString();

const cards = [
  {
    title: "Tailored omnichannel strategies",
    description:
      "Unlike other agencies’ cookie-cutter approaches, we craft personalized go-to-market plans that align perfectly with your unique business objectives and integrate both outbound and inbound efforts.",
    src: "https://res.cloudinary.com/diptffkzh/image/upload/v1760183048/tailored-omnichannel-strategies.DnUZGnlx_cbbrim.webp",
  },
  {
    title: "World-class talent",
    description:
      "We carefully select teams to work on your project and to act as an extension of your own. Rest assured, you’ll get dedicated specialists with narrow industry knowledge, relevant certifications, and dozens of successful cases.",
    src: "https://res.cloudinary.com/diptffkzh/image/upload/v1760183048/world-class-talent.Bj5AP60s_q1qsny.webp",
  },
  {
    title: "The first results within a month",
    description:
      "We set up and launch your campaign in the first 14 days. Within the next 30 days, you’ll start seeing the first appointments in your calendar.",
    src: "https://res.cloudinary.com/diptffkzh/image/upload/v1760183047/first-results-within-month.CZkWujlE_gdymaa.webp",
  },
  {
    title: "B2B-focused expertise",
    description:
      "Our deep understanding of the B2B landscape empowers us to use the right cutting-edge tools and deliver targeted, result-oriented outbound solutions that last even if we part ways.",
    src: "https://res.cloudinary.com/diptffkzh/image/upload/v1760183047/b2b-focused-expertise.WCKyBRCN_i3oqmb.webp",
  },
  {
    title: "Cross-functional approach",
    description:
      "Our end-to-end strategy and implementation support cover every stage of the deal generation process, from inbound lead gen to strategy consulting, minimizing risks and raising sales by 25% on average.",
    src: "https://res.cloudinary.com/diptffkzh/image/upload/v1760183047/cross-functional-approach.D0BzI-D5_ndwueh.webp",
  },
];

test.describe("What sets us apart section", () => {
  test("renders header, CTA, and exact card content", async ({ page }) => {
    await page.goto(fileUrl);

    const section = page.locator("#sets-apart");
    await expect(section).toBeVisible();
    await expect(section.locator("h2#sets-apart-heading")).toHaveText("What sets us apart");
    await expect(section.locator(".sets-apart__intro p")).toContainText(
      "Since 2017, Belkins has been the top outbound lead generation agency for B2B companies across 50+ industries. Here’s why:"
    );
    await expect(section.getByRole("link", { name: "Get a quote" })).toBeVisible();

    const cardLocators = section.locator(".sets-apart__card");
    await expect(cardLocators).toHaveCount(cards.length);

    for (let index = 0; index < cards.length; index += 1) {
      const data = cards[index];
      const card = cardLocators.nth(index);
      await expect(card.locator("h3")).toHaveText(data.title);
      await expect(card.locator("p")).toHaveText(data.description);
      const image = card.locator("img");
      await expect(image).toHaveAttribute("src", data.src);
      await expect(image).toHaveAttribute("alt", data.title);
    }
  });

  test("adjusts columns across breakpoints without horizontal scroll", async ({ page }) => {
    const getColumnCount = async () => {
      const grid = page.locator("#sets-apart .sets-apart__grid");
      await expect(grid).toBeVisible();
      return grid.evaluate((node) => {
        const items = Array.from(node.querySelectorAll("article"));
        const columns = [];
        items.forEach((item) => {
          const left = item.getBoundingClientRect().left;
          if (!columns.some((value) => Math.abs(value - left) < 4)) {
            columns.push(left);
          }
        });
        return columns.length;
      });
    };

    await page.setViewportSize({ width: 360, height: 720 });
    await page.goto(fileUrl);
    expect(await getColumnCount()).toBe(1);
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 1;
    });
    expect(hasHorizontalScroll).toBeFalsy();

    await page.setViewportSize({ width: 768, height: 720 });
    await page.goto(fileUrl);
    expect(await getColumnCount()).toBe(2);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(fileUrl);
    expect(await getColumnCount()).toBe(3);
  });
});

