#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

let Ajv;
try {
  Ajv = require("ajv");
} catch (error) {
  console.error('Missing dependency "ajv". Install with: npm install ajv');
  process.exit(2);
}

const args = process.argv.slice(2);
const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return null;
  }
  return args[index + 1];
};

const schemaPath =
  getArgValue("--schema") ||
  path.resolve(process.cwd(), "interop.schema.json");
const mappingsPath =
  getArgValue("--file") ||
  getArgValue("--mappings") ||
  path.resolve(process.cwd(), "mappings.json");

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Failed to read JSON: ${filePath}`);
    console.error(error.message);
    process.exit(1);
  }
};

const schema = readJson(schemaPath);
const data = readJson(mappingsPath);

const ajv = new Ajv({
  allErrors: true,
  strict: false
});

const validate = ajv.compile(schema);
const valid = validate(data);

if (valid) {
  console.log(`OK: ${path.basename(mappingsPath)} matches ${path.basename(schemaPath)}`);
  process.exit(0);
}

console.error("Schema validation failed:");
for (const error of validate.errors || []) {
  const instancePath = error.instancePath || "/";
  console.error(`- ${instancePath} ${error.message}`);
}
process.exit(1);
