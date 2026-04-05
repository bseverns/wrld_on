#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

let Ajv;
try {
  Ajv = require("ajv");
} catch (error) {
  console.error('Missing dependency "ajv". Install with: npm install');
  process.exit(2);
}

const args = process.argv.slice(2);
let profilePath;
let schemaPath;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--schema") {
    schemaPath = args[i + 1];
    i += 1;
    continue;
  }
  if (!profilePath) {
    profilePath = arg;
  }
}

const repoRoot = path.resolve(__dirname, "..");
const resolvedProfilePath = path.resolve(
  profilePath || path.join(repoRoot, "interop", "exports", "live-rig.default.json")
);
const resolvedSchemaPath = path.resolve(
  schemaPath || path.join(repoRoot, "interop", "rig.profile.schema.json")
);

const profile = readJson(resolvedProfilePath, "profile");
const schema = readJson(resolvedSchemaPath, "schema");

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const valid = validate(profile);

let ok = Boolean(valid);
if (!valid) {
  console.error("Schema validation failed:");
  for (const err of validate.errors || []) {
    const where = err.instancePath || "/";
    console.error(`- ${where} ${err.message}`);
  }
}

const logicalErrors = validateBindings(profile);
if (logicalErrors.length) {
  ok = false;
  console.error("Logical validation failed:");
  for (const err of logicalErrors) {
    console.error(`- ${err}`);
  }
}

if (!ok) {
  process.exit(1);
}

console.log(
  `OK: profile ${profile.snapshotVersion} validated with ${profile.bindings.length} binding(s).`
);

function readJson(targetPath, label) {
  try {
    return JSON.parse(fs.readFileSync(targetPath, "utf8"));
  } catch (error) {
    console.error(`Failed to read ${label} JSON at ${targetPath}: ${error.message}`);
    process.exit(1);
  }
}

function validateBindings(profileData) {
  const errors = [];
  const bindings = Array.isArray(profileData.bindings) ? profileData.bindings : [];
  for (const binding of bindings) {
    if (
      binding.supported &&
      (!Array.isArray(binding.midi) || !Array.isArray(binding.osc))
    ) {
      errors.push(
        `Supported binding ${binding.semanticId} must include midi and osc arrays.`
      );
    }
  }
  return errors;
}
