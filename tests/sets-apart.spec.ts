import { expect, test } from '@playwright/test';
import path from 'path';

const htmlFileUrl = `file://${path.resolve(__dirname, '../index.html')}`;

const cardDetails = [
  {
    title: 'Tailored omnichannel strategies',
    src: 'https://res.cloudinary.com/diptffkzh/image/upload/v1760183048/tailored-omnichannel-strategies.DnUZGnlx_cbbrim.webp',
  },
  {
    title: 'World-class talent',
    src: 'https://res.cloudinary.com/diptffkzh/image/upload/v1760183048/world-class-talent.Bj5AP60s_q1qsny.webp',
  },
  {
    title: 'The first results within a month',
    src: 'https://res.cloudinary.com/diptffkzh/image/upload/v1760183047/first-results-within-month.CZkWujlE_gdymaa.webp',
  },
  {
    title: 'B2B-focused expertise',
    src: 'https://res.cloudinary.com/diptffkzh/image/upload/v1760183047/b2b-focused-expertise.WCKyBRCN_i3oqmb.webp',
  },
  {
    title: 'Cross-functional approach',
    src: 'https://res.cloudinary.com/diptffkzh/image/upload/v1760183047/cross-functional-approach.D0BzI-D5_ndwueh.webp',
  },
];

const calculateColumnCount = () => {
  const tolerance = 4;
  const cards = Array.from(document.querySelectorAll('#sets-apart .sets-apart__card'));
  const columns: number[] = [];

  cards.forEach((element) => {
    const { left } = element.getBoundingClientRect();
    const existingColumn = columns.find((value) => Math.abs(value - left) <= tolerance);

    if (existingColumn === undefined) {
      columns.push(left);
    }
  });

  return columns.length;
};

test.describe('What sets us apart section', () => {
  test('matches content and responsive layout requirements', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(htmlFileUrl);

    const section = page.locator('#sets-apart');
    await expect(section).toBeVisible();

    const heading = section.locator('h2');
    await expect(heading).toHaveText('What sets us apart');

    const cta = section.locator('.sets-apart__cta');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveText('Get a quote');

    const cards = section.locator('.sets-apart__card');
    await expect(cards).toHaveCount(cardDetails.length);

    for (let index = 0; index < cardDetails.length; index += 1) {
      const { title, src } = cardDetails[index];
      const card = cards.nth(index);
      const image = card.locator('img');

      await expect(image).toHaveAttribute('src', src);
      await expect(image).toHaveAttribute('alt', title);
    }

    const assertColumns = async (width: number, expected: number) => {
      await page.setViewportSize({ width, height: 800 });
      await page.reload();
      await expect(section).toBeVisible();

      const columnCount = await page.evaluate(calculateColumnCount);
      expect(columnCount).toBe(expected);

      if (width === 360) {
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });

        expect(hasHorizontalScroll).toBeFalsy();
      }
    };

    await assertColumns(360, 1);
    await assertColumns(768, 2);
    await assertColumns(1280, 3);
  });
});
