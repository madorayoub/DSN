#!/usr/bin/env node

const { execSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

const textFilePattern = /\.(?:[jt]sx?|json|css|html?|md|mdx|yml|yaml|txt|cjs|mjs|tsconfig|config|lock)$/i;
const skipDirs = ["node_modules/", "docs/assets/", "docs/fonts/"];
const forbiddenPattern = /(\s)(?:®|&reg;)/g;

const files = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => !skipDirs.some((dir) => file.startsWith(dir)))
  .filter((file) => textFilePattern.test(file));

const offenders = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  let match;
  forbiddenPattern.lastIndex = 0;
  while ((match = forbiddenPattern.exec(content)) !== null) {
    const priorContent = content.slice(0, match.index);
    const line = priorContent.split(/\r?\n/).length;
    const column = match.index - priorContent.lastIndexOf("\n");
    offenders.push({ file, line, column });
  }
}

if (offenders.length > 0) {
  console.error("Found spacing before registered symbol (®/&reg;). Please remove spaces before the symbol.\n");
  for (const { file, line, column } of offenders) {
    console.error(`${file}:${line}:${column}`);
  }
  process.exit(1);
}
