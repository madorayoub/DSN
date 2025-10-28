#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const parseArgs = () => {
  const entries = process.argv.slice(2).map((arg) => {
    const [key, value] = arg.split("=");
    return [key.replace(/^--/, ""), value];
  });

  return Object.fromEntries(entries);
};

const launchWithPlaywright = async ({ url, out, width, height }) => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
};

const launchWithPuppeteer = async ({ url, out, width, height }) => {
  const puppeteer = await import("puppeteer").catch(() => null);
  if (!puppeteer) {
    throw new Error("Puppeteer is not installed. Run `npm install --save-dev puppeteer` to enable the fallback.");
  }
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
};

const main = async () => {
  const args = parseArgs();
  const { url, out, viewport } = args;

  if (!url || !out || !viewport) {
    console.error("Usage: node scripts/screenshot-case-studies.mjs --url=<url> --out=<path> --viewport=<width,height>");
    process.exit(1);
  }

  const [widthRaw, heightRaw] = viewport.split(",");
  const width = Number.parseInt(widthRaw, 10);
  const height = Number.parseInt(heightRaw, 10);

  if (Number.isNaN(width) || Number.isNaN(height)) {
    console.error("Viewport must be provided as width,height (e.g. 1440,900)");
    process.exit(1);
  }

  const outputPath = resolve(process.cwd(), out);
  await mkdir(dirname(outputPath), { recursive: true });

  try {
    await launchWithPlaywright({ url, out: outputPath, width, height });
  } catch (error) {
    console.warn("Playwright not available, falling back to Puppeteer.\n", error.message);
    await launchWithPuppeteer({ url, out: outputPath, width, height });
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
