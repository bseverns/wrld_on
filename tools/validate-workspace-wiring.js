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
const configPath = path.resolve(
  getArgValue("--config") || path.join(repoRoot, "nw_wrld_data", "json", "runtimeConfig.json")
);
const runtimeConfig = readJson(configPath, "runtime config");

const profilePath = path.resolve(
  getArgValue("--profile") ||
    path.join(repoRoot, runtimeConfig.interop?.profilePath || "interop/exports/live-rig.default.json")
);
const profile = readJson(profilePath, "rig profile");

const errors = [];
const semanticBindings = runtimeConfig.semanticBindings;
if (!semanticBindings || typeof semanticBindings !== "object") {
  errors.push("runtimeConfig.semanticBindings is missing.");
}

const commandNames = new Set(Object.keys(runtimeConfig.commands || {}));
const profileBindings = new Map();
for (const binding of profile.bindings || []) {
  if (binding && binding.semanticId) {
    profileBindings.set(binding.semanticId, binding);
  }
}

for (const [semanticId, binding] of profileBindings.entries()) {
  if (!binding.supported) {
    continue;
  }
  const localBinding = semanticBindings?.[semanticId];
  if (!localBinding) {
    errors.push(`Missing semantic binding for ${semanticId}.`);
    continue;
  }

  if (!Array.isArray(localBinding.addresses) || localBinding.addresses.length === 0) {
    errors.push(`${semanticId} must declare one or more incoming OSC addresses.`);
  }

  const expectedOscAddresses = new Set(
    (binding.osc || []).map((entry) => entry && entry.address).filter(Boolean)
  );
  for (const address of localBinding.addresses || []) {
    if (!expectedOscAddresses.has(address)) {
      errors.push(
        `${semanticId} address ${address} is not present in mirrored rig profile.`
      );
    }
  }

  if (localBinding.command && !commandNames.has(localBinding.command)) {
    errors.push(
      `${semanticId} references unknown runtime command "${localBinding.command}".`
    );
  }
}

for (const semanticId of Object.keys(semanticBindings || {})) {
  if (!profileBindings.has(semanticId)) {
    errors.push(
      `runtimeConfig.semanticBindings contains ${semanticId}, which is not a supported binding in the mirrored rig profile.`
    );
  }
}

if (errors.length) {
  console.error("Workspace wiring validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `OK: ${profileBindings.size} mirrored rig binding(s) are wired in ${path.relative(
    repoRoot,
    configPath
  )}.`
);

function readJson(targetPath, label) {
  try {
    return JSON.parse(fs.readFileSync(targetPath, "utf8"));
  } catch (error) {
    console.error(`Failed to read ${label} JSON at ${targetPath}: ${error.message}`);
    process.exit(1);
  }
}
