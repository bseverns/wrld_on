#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return null;
  }
  return args[index + 1];
};

const repoRoot = path.resolve(__dirname, "..");
const sourceRoot = path.resolve(
  getArgValue("--source-root") ||
    process.env.LIVE_RIG_ROOT ||
    path.join(repoRoot, "..", "live-rig")
);

const copies = [
  {
    source: path.join(sourceRoot, "interop", "exports", "live-rig.default.json"),
    target: path.join(repoRoot, "interop", "exports", "live-rig.default.json")
  },
  {
    source: path.join(sourceRoot, "interop", "rig.profile.schema.json"),
    target: path.join(repoRoot, "interop", "rig.profile.schema.json")
  },
  {
    source: path.join(sourceRoot, "interop", "interop.schema.json"),
    target: path.join(repoRoot, "interop", "interop.schema.json")
  }
];

for (const copy of copies) {
  if (!fs.existsSync(copy.source)) {
    console.error(`Missing authority artifact: ${copy.source}`);
    process.exit(1);
  }
}

for (const copy of copies) {
  fs.mkdirSync(path.dirname(copy.target), { recursive: true });
  fs.copyFileSync(copy.source, copy.target);
  console.log(
    `Synced ${path.relative(repoRoot, copy.target)} from ${path.relative(repoRoot, copy.source)}`
  );
}
