#!/usr/bin/env node
const { execSync } = require("child_process");
const path = require("path");

const tsxPath = path.join(__dirname, "./node_modules/.bin/tsx");
try {
  execSync(`${tsxPath} ./index.ts`, { stdio: "inherit" });
} catch (e) {
  // Gracefully exit if needed
  process.exit(1);
}
