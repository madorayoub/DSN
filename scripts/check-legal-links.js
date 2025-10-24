#!/usr/bin/env node

const { execSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const repoRoot = resolve(__dirname, "..");

const htmlFiles = execSync('git ls-files "docs/**/*.html"', { encoding: "utf8", cwd: repoRoot })
  .split("\n")
  .filter(Boolean);

const patterns = [
  {
    regex: /href=["']\.\/privacy-policy\.html["']/gi,
    message: "Found relative privacy policy link",
  },
  {
    regex: /href=["']privacy-policy\.html["']/gi,
    message: "Found relative privacy policy link",
  },
  {
    regex: /href=["']\.\/terms-of-service\.html["']/gi,
    message: "Found relative terms of service link",
  },
  {
    regex: /href=["']terms-of-service\.html["']/gi,
    message: "Found relative terms of service link",
  },
];

const offenders = [];

for (const file of htmlFiles) {
  const content = readFileSync(resolve(repoRoot, file), "utf8");

  for (const { regex, message } of patterns) {
    regex.lastIndex = 0;
    const match = regex.exec(content);
    if (match) {
      const before = content.slice(0, match.index);
      const line = before.split(/\r?\n/).length;
      offenders.push(`${file}:${line} -> ${message}`);
    }
  }
}

if (offenders.length > 0) {
  console.error("Invalid legal footer links detected:\n");
  for (const offender of offenders) {
    console.error(offender);
  }
  process.exit(1);
}

const termsPage = resolve(repoRoot, "app", "terms-of-service", "page.tsx");
const termsContent = readFileSync(termsPage, "utf8");

if (/Placeholder\./.test(termsContent)) {
  console.error("app/terms-of-service/page.tsx still contains placeholder text.");
  process.exit(1);
}
