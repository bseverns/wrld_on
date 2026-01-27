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

const hasFlag = (flag) => args.includes(flag);

const mappingsPath =
  getArgValue("--file") ||
  getArgValue("--mappings") ||
  path.resolve(process.cwd(), "mappings.json");
const requestedId = getArgValue("--id") || getArgValue("-i");
const requestedAddress = getArgValue("--address");
const profileFilter = getArgValue("--profile");
const action = hasFlag("--off") ? "off" : "on";

if (!requestedId && !requestedAddress) {
  console.error("Usage: node tools/simulate-mapping.js --id <pad-id-or-osc-address> [--file mappings.json] [--profile name] [--on|--off]");
  process.exit(1);
}

const lookupToken = requestedId || requestedAddress;

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Failed to read JSON: ${filePath}`);
    console.error(error.message);
    process.exit(1);
  }
};

const data = readJson(mappingsPath);
const profiles = data.profiles;

if (!profiles || typeof profiles !== "object") {
  console.error("Invalid mappings file: missing profiles object.");
  process.exit(1);
}

const findPad = () => {
  const profileKeys = profileFilter ? [profileFilter] : Object.keys(profiles);
  for (const profileKey of profileKeys) {
    const profile = profiles[profileKey];
    if (!profile || !Array.isArray(profile.pads)) {
      continue;
    }
    const byId = profile.pads.find((pad) => pad.id === lookupToken);
    if (byId) {
      return { profileKey, pad: byId };
    }
    const byAddress = profile.pads.find(
      (pad) => pad.osc && pad.osc.address === lookupToken
    );
    if (byAddress) {
      return { profileKey, pad: byAddress };
    }
  }
  return null;
};

const result = findPad();
if (!result) {
  console.error(`No pad found for "${lookupToken}".`);
  process.exit(1);
}

const { profileKey, pad } = result;

const isToggle = pad.toggle === true || pad.mode === "toggle";
const effectiveAction = isToggle ? action : "on";

const formatArgs = (argsList) =>
  Array.isArray(argsList) ? JSON.stringify(argsList) : "[]";

const resolveOsc = () => {
  if (!pad.osc) {
    return null;
  }
  const osc = pad.osc;
  if (effectiveAction === "on") {
    if (osc.onArgs !== undefined) {
      return { address: osc.address, args: osc.onArgs };
    }
    if (osc.args !== undefined) {
      return { address: osc.address, args: osc.args };
    }
    if (osc.offArgs !== undefined) {
      return { address: osc.address, args: osc.offArgs };
    }
    return { address: osc.address, args: [] };
  }
  if (osc.offArgs !== undefined) {
    return { address: osc.address, args: osc.offArgs };
  }
  if (osc.args !== undefined) {
    return { address: osc.address, args: osc.args };
  }
  if (osc.onArgs !== undefined) {
    return { address: osc.address, args: osc.onArgs };
  }
  return { address: osc.address, args: [] };
};

const resolveMidi = () => {
  if (!pad.midi) {
    return null;
  }
  const midi = pad.midi;
  if (midi.type === "note") {
    const velocity =
      effectiveAction === "off"
        ? midi.offVelocity ?? 0
        : midi.onVelocity ?? 127;
    return {
      type: "note",
      channel: midi.channel,
      note: midi.note,
      velocity
    };
  }
  if (midi.type === "cc") {
    const value =
      effectiveAction === "off" ? midi.offValue ?? 0 : midi.onValue ?? 127;
    return {
      type: "cc",
      channel: midi.channel,
      cc: midi.cc,
      value
    };
  }
  return null;
};

const getGroupId = (group) => {
  if (!group) {
    return null;
  }
  if (typeof group === "string") {
    return group;
  }
  return group.id || null;
};

const isGroupExclusive = (group) => {
  if (!group || typeof group === "string") {
    return false;
  }
  return group.mode === "exclusive" || group.exclusive === true;
};

const oscAction = resolveOsc();
const midiAction = resolveMidi();

console.log(`Profile: ${profileKey}`);
console.log(`Pad: ${pad.id}${pad.label ? ` (${pad.label})` : ""}`);
console.log(`Mode: ${isToggle ? "toggle" : "momentary"} action: ${effectiveAction}`);

if (oscAction) {
  console.log(`OSC: ${oscAction.address} ${formatArgs(oscAction.args)}`);
} else {
  console.log("OSC: (none)");
}

if (midiAction) {
  if (midiAction.type === "note") {
    console.log(
      `MIDI: note ch=${midiAction.channel} note=${midiAction.note} velocity=${midiAction.velocity}`
    );
  } else {
    console.log(
      `MIDI: cc ch=${midiAction.channel} cc=${midiAction.cc} value=${midiAction.value}`
    );
  }
} else {
  console.log("MIDI: (none)");
}

const groupId = getGroupId(pad.group);
if (groupId && isGroupExclusive(pad.group) && effectiveAction === "on") {
  const profile = profiles[profileKey];
  const peers = profile.pads.filter(
    (peer) => peer.id !== pad.id && getGroupId(peer.group) === groupId
  );
  if (peers.length > 0) {
    const peerIds = peers.map((peer) => peer.id).join(", ");
    console.log(`Exclusive group "${groupId}": would turn off [${peerIds}]`);
  }
}
