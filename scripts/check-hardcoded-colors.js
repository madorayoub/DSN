#!/usr/bin/env node

const { execSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

const skipDirs = ["node_modules/", "docs/assets/"];
const skipFiles = new Set(["docs/tokens.css"]);

const fileAllowances = [
  { file: "docs/index.html", allow: (line) => line.includes("theme-color") },
  { file: "docs/industries.html", allow: (line) => line.includes("theme-color") },
  { file: "app/layout.tsx", allow: (line) => line.includes("themeColor:") },
];

const patterns = [
  /#(?:[A-Fa-f0-9]{3,4}){1,2}\b/g,
  /rgba?\([^)]*\)/gi,
  /hsla?\([^)]*\)/gi,
];

const files = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => !skipFiles.has(file))
  .filter((file) => !skipDirs.some((dir) => file.startsWith(dir)));

const offenders = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  const allowance = fileAllowances.find((entry) => entry.file === file);

  patterns.forEach((regex) => {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const lineIndex = content.slice(0, match.index).split(/\r?\n/).length - 1;
      const line = lines[lineIndex]?.trim() ?? "";
      if (allowance && allowance.allow(line)) {
        continue;
      }
      offenders.push({ file, line: lineIndex + 1, snippet: line });
    }
  });
}

if (offenders.length > 0) {
  console.error("Hard-coded colors detected outside token files:\n");
  for (const { file, line, snippet } of offenders) {
    console.error(`${file}:${line} -> ${snippet}`);
  }
  process.exit(1);
}
