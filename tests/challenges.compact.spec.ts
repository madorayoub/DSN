import { expect, test } from '@playwright/test';
import path from 'path';

const htmlFileUrl = `file://${path.resolve(__dirname, '../index.html')}`;

test.describe('Challenges section layout', () => {
  test('remains compact across breakpoints', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(htmlFileUrl);

    const section = page.locator('#challenges');
    await expect(section).toBeVisible();

    const sectionHeight = await section.evaluate((node) => node.getBoundingClientRect().height);
    expect(sectionHeight).toBeLessThan(780);

    const cards = page.locator('#challenges .challenge-card');
    await expect(cards).toHaveCount(6);

    const assertColumns = async (width: number, expected: number) => {
      await page.setViewportSize({ width, height: 800 });
      await page.reload();
      await expect(section).toBeVisible();

      const columnCount = await page.evaluate(() => {
        const tolerance = 4;
        const items = Array.from(document.querySelectorAll('#challenges .challenge-card'));
        const leftPositions: number[] = [];

        items.forEach((item) => {
          const { left } = item.getBoundingClientRect();
          const match = leftPositions.find((value) => Math.abs(value - left) <= tolerance);
          if (match === undefined) {
            leftPositions.push(left);
          }
        });

        return leftPositions.length;
      });

      expect(columnCount).toBe(expected);

      if (expected === 2) {
        const averageHeight = await page.evaluate(() => {
          const items = Array.from(document.querySelectorAll('#challenges .challenge-card'));
          if (items.length === 0) {
            return 0;
          }

          const total = items.reduce((sum, item) => sum + item.getBoundingClientRect().height, 0);
          return total / items.length;
        });

        expect(averageHeight).toBeLessThanOrEqual(300);
      }

      if (expected === 1) {
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
