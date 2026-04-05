#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const dgram = require("dgram");
const http = require("http");

const args = process.argv.slice(2);
const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return null;
  }
  return args[index + 1];
};
const hasFlag = (flag) => args.includes(flag);

const DEFAULT_CONFIG = {
  osc: {
    host: "127.0.0.1",
    port: 9000,
    listenHost: "0.0.0.0",
    listenPort: 9001,
    logInbound: false
  },
  commands: {
    blackout: { address: "/nw_wrld/blackout/enable", on: [1], off: [0] },
    feed: { address: "/nw_wrld/feed/enable", on: [1], off: [0] },
    overlays: { address: "/nw_wrld/overlays/enable", on: [1], off: [0] }
  },
  interop: {
    profilePath: "interop/exports/live-rig.default.json"
  },
  semanticBindings: {},
  startup: {
    apply: true,
    delayMs: 0,
    force: true,
    state: { blackout: true, feed: false, overlays: false }
  },
  watchdog: {
    enabled: true,
    timeoutSec: 10,
    checkIntervalMs: 500,
    fadeMs: 0,
    recoverOnActivity: false,
    safeState: { blackout: true, feed: false, overlays: false }
  },
  panic: {
    enabled: true,
    hotkey: "p",
    safeState: { blackout: true, feed: false, overlays: false },
    exitAfter: false
  },
  health: {
    logIntervalSec: 10,
    httpPort: 8181,
    fpsAddress: "/nw_wrld/health/fps"
  },
  state: {
    subscriptions: {
      blackout: "/nw_wrld/blackout/state",
      feed: "/nw_wrld/feed/state",
      overlays: "/nw_wrld/overlays/state"
    }
  }
};

const deepMerge = (base, override) => {
  if (!override || typeof override !== "object") {
    return base;
  }
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override.slice() : base.slice();
  }
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(base[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
};

const defaultConfigPath = path.resolve(
  process.cwd(),
  "nw_wrld_data/json/runtimeConfig.json"
);
const configPath = path.resolve(
  process.cwd(),
  getArgValue("--config") || defaultConfigPath
);

if (hasFlag("--print-default-config")) {
  console.log(JSON.stringify(DEFAULT_CONFIG, null, 2));
  process.exit(0);
}

const loadConfig = () => {
  if (!fs.existsSync(configPath)) {
    console.warn(`Config not found at ${configPath}. Using defaults.`);
    return { ...DEFAULT_CONFIG };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return deepMerge(DEFAULT_CONFIG, parsed);
  } catch (error) {
    console.error(`Failed to read config: ${configPath}`);
    console.error(error.message);
    process.exit(1);
  }
};

const config = loadConfig();

const runtimeState = {
  snapshot: {
    semantic: {}
  },
  fps: null,
  lastOscAt: Date.now(),
  watchdogActive: false
};

const addressToStateKey = {};
if (config.state && config.state.subscriptions) {
  for (const [key, address] of Object.entries(config.state.subscriptions)) {
    addressToStateKey[address] = key;
  }
}

const semanticAddressToBinding = {};
if (config.semanticBindings && typeof config.semanticBindings === "object") {
  for (const [semanticId, binding] of Object.entries(config.semanticBindings)) {
    if (!binding || !Array.isArray(binding.addresses)) {
      continue;
    }
    for (const address of binding.addresses) {
      semanticAddressToBinding[address] = {
        ...binding,
        semanticId
      };
    }
  }
}

const padToFour = (value) => {
  const pad = (4 - (value % 4)) % 4;
  return pad === 0 ? value : value + pad;
};

const encodeOscString = (value) => {
  const buf = Buffer.from(`${value}\u0000`, "utf8");
  const padded = Buffer.alloc(padToFour(buf.length));
  buf.copy(padded);
  return padded;
};

const encodeOscArgument = (value) => {
  if (value === null || value === undefined) {
    return { type: "N", buf: Buffer.alloc(0) };
  }
  if (typeof value === "string") {
    return { type: "s", buf: encodeOscString(value) };
  }
  if (typeof value === "boolean") {
    return { type: value ? "T" : "F", buf: Buffer.alloc(0) };
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      const buf = Buffer.alloc(4);
      buf.writeInt32BE(value, 0);
      return { type: "i", buf };
    }
    const buf = Buffer.alloc(4);
    buf.writeFloatBE(value, 0);
    return { type: "f", buf };
  }
  return { type: "N", buf: Buffer.alloc(0) };
};

const buildOscMessage = (address, args) => {
  const encodedArgs = (args || []).map(encodeOscArgument);
  const typeTags = `,${encodedArgs.map((item) => item.type).join("")}`;
  const parts = [
    encodeOscString(address),
    encodeOscString(typeTags),
    ...encodedArgs.map((item) => item.buf)
  ];
  return Buffer.concat(parts);
};

const readOscString = (buffer, offset) => {
  let end = offset;
  while (end < buffer.length && buffer[end] !== 0) {
    end += 1;
  }
  const value = buffer.slice(offset, end).toString("utf8");
  const next = padToFour(end + 1);
  return { value, next };
};

const decodeOscMessage = (buffer, offset = 0) => {
  const addressPart = readOscString(buffer, offset);
  const address = addressPart.value;
  const typePart = readOscString(buffer, addressPart.next);
  const types = typePart.value.startsWith(",")
    ? typePart.value.slice(1)
    : typePart.value;
  let cursor = typePart.next;
  const args = [];
  for (const type of types) {
    if (type === "i") {
      args.push(buffer.readInt32BE(cursor));
      cursor += 4;
    } else if (type === "f") {
      args.push(buffer.readFloatBE(cursor));
      cursor += 4;
    } else if (type === "s") {
      const str = readOscString(buffer, cursor);
      args.push(str.value);
      cursor = str.next;
    } else if (type === "T") {
      args.push(true);
    } else if (type === "F") {
      args.push(false);
    } else if (type === "N") {
      args.push(null);
    }
  }
  return { address, args };
};

const decodeOscPacket = (buffer) => {
  const header = buffer.slice(0, 7).toString("utf8");
  if (header === "#bundle") {
    let cursor = 16;
    const messages = [];
    while (cursor < buffer.length) {
      const length = buffer.readInt32BE(cursor);
      cursor += 4;
      const payload = buffer.slice(cursor, cursor + length);
      cursor += length;
      messages.push(...decodeOscPacket(payload));
    }
    return messages;
  }
  return [decodeOscMessage(buffer)];
};

const socket = dgram.createSocket("udp4");
const sendOsc = (address, args = []) => {
  if (!address) {
    return;
  }
  if (hasFlag("--dry-run")) {
    console.log(`DRY RUN OSC -> ${address} ${JSON.stringify(args)}`);
    return;
  }
  const message = buildOscMessage(address, args);
  socket.send(message, 0, message.length, config.osc.port, config.osc.host);
};

const applyCommand = (name, enabled, options = {}) => {
  const command = config.commands && config.commands[name];
  if (!command || !command.address) {
    return;
  }
  if (!options.force && runtimeState.snapshot[name] === enabled) {
    return;
  }
  const args = enabled
    ? command.on ?? command.args ?? []
    : command.off ?? command.args ?? [];
  sendOsc(command.address, args);
  runtimeState.snapshot[name] = enabled;
};

const recordSemanticSnapshot = (semanticId, value) => {
  if (!runtimeState.snapshot.semantic) {
    runtimeState.snapshot.semantic = {};
  }
  runtimeState.snapshot.semantic[semanticId] = value;
};

const extractSemanticValue = (message, binding) => {
  if (!message || !Array.isArray(message.args) || message.args.length === 0) {
    return binding.onValue !== undefined ? binding.onValue : true;
  }
  return message.args.length === 1 ? message.args[0] : message.args.slice();
};

const coerceSemanticActive = (value, binding) => {
  const firstValue = Array.isArray(value) ? value[0] : value;
  if (typeof firstValue === "boolean") {
    return firstValue;
  }
  if (typeof firstValue === "number") {
    return firstValue !== (binding.offValue !== undefined ? binding.offValue : 0);
  }
  if (typeof firstValue === "string") {
    const normalized = firstValue.trim().toLowerCase();
    return !["", "0", "false", "off"].includes(normalized);
  }
  return Boolean(firstValue);
};

const applyNamedState = (state, options = {}) => {
  if (!state || typeof state !== "object") {
    return;
  }
  if ("overlays" in state) {
    applyCommand("overlays", Boolean(state.overlays), options);
  }
  if ("feed" in state) {
    applyCommand("feed", Boolean(state.feed), options);
  }
  if ("blackout" in state) {
    if (options.fadeMs && Boolean(state.blackout)) {
      setTimeout(
        () => applyCommand("blackout", true, options),
        options.fadeMs
      );
    } else {
      applyCommand("blackout", Boolean(state.blackout), options);
    }
  }
  for (const key of Object.keys(state)) {
    if (["overlays", "feed", "blackout"].includes(key)) {
      continue;
    }
    if (config.commands && config.commands[key]) {
      applyCommand(key, Boolean(state[key]), options);
    }
  }
};

const applySemanticBinding = (binding, message) => {
  const value = extractSemanticValue(message, binding);
  const active = coerceSemanticActive(value, binding);

  recordSemanticSnapshot(binding.semanticId, value);

  if (binding.kind === "command") {
    if (binding.command) {
      applyCommand(binding.command, active, { force: true });
    }
    return;
  }

  if (binding.kind === "scene") {
    if (active) {
      runtimeState.snapshot.activeScene = binding.semanticId;
      if (binding.stateOn) {
        applyNamedState(binding.stateOn, { force: true });
      }
    } else if (runtimeState.snapshot.activeScene === binding.semanticId) {
      runtimeState.snapshot.activeScene = null;
      if (binding.stateOff) {
        applyNamedState(binding.stateOff, { force: true });
      }
    }
    return;
  }

  if (binding.kind === "state") {
    if (binding.command) {
      applyCommand(binding.command, active, { force: true });
    }
    if (binding.stateKey) {
      runtimeState.snapshot[binding.stateKey] = active;
    }
    if (active && binding.stateOn) {
      applyNamedState(binding.stateOn, { force: true });
    } else if (!active && binding.stateOff) {
      applyNamedState(binding.stateOff, { force: true });
    }
    return;
  }

  if (binding.stateKey) {
    runtimeState.snapshot[binding.stateKey] = value;
  }
};

const triggerPanic = (reason = "panic") => {
  const safeState = config.panic && config.panic.safeState;
  console.log(`Triggering ${reason} safe state.`);
  applyNamedState(safeState, { force: true });
  if (config.panic && config.panic.exitAfter) {
    setTimeout(() => process.exit(0), 50);
  }
};

const triggerWatchdogSafeState = () => {
  const safeState = config.watchdog && config.watchdog.safeState;
  const fadeMs = (config.watchdog && config.watchdog.fadeMs) || 0;
  console.log("Watchdog timeout reached. Applying safe state.");
  runtimeState.watchdogActive = true;
  applyNamedState(safeState, { force: true, fadeMs });
};

const logStatus = () => {
  const snapshot = {
    ...runtimeState.snapshot,
    fps: runtimeState.fps,
    lastOscAt: new Date(runtimeState.lastOscAt).toISOString(),
    watchdogActive: runtimeState.watchdogActive
  };
  console.log(`[status] ${JSON.stringify(snapshot)}`);
};

const startHealthServer = () => {
  const port = Number(config.health && config.health.httpPort);
  if (!port) {
    return;
  }
  const server = http.createServer((req, res) => {
    const payload = {
      ok: true,
      osc: {
        host: config.osc.host,
        port: config.osc.port,
        listenHost: config.osc.listenHost,
        listenPort: config.osc.listenPort
      },
      state: {
        ...runtimeState.snapshot,
        fps: runtimeState.fps,
        lastOscAt: runtimeState.lastOscAt,
        watchdogActive: runtimeState.watchdogActive
      }
    };
    if (req.url === "/state" || req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload, null, 2));
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "Not found" }));
  });
  server.on("error", (error) => {
    console.warn(`Health server error: ${error.message}`);
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(`Health server listening on http://0.0.0.0:${port}`);
  });
};

const initRuntime = () => {
  console.log(`OSC out: ${config.osc.host}:${config.osc.port}`);
  console.log(`OSC in: ${config.osc.listenHost}:${config.osc.listenPort}`);
  if (config.interop && config.interop.profilePath) {
    console.log(`Rig profile: ${config.interop.profilePath}`);
  }
  if (config.health && config.health.httpPort) {
    console.log(`Health HTTP: 0.0.0.0:${config.health.httpPort}`);
  }

  socket.on("message", (msg, rinfo) => {
    runtimeState.lastOscAt = Date.now();
    if (config.osc && config.osc.logInbound) {
      console.log(`OSC in ${rinfo.address}:${rinfo.port} (${msg.length} bytes)`);
    }
    let messages = [];
    try {
      messages = decodeOscPacket(msg);
    } catch (error) {
      return;
    }
    for (const message of messages) {
      if (!message || !message.address) {
        continue;
      }
      if (
        config.health &&
        config.health.fpsAddress &&
        message.address === config.health.fpsAddress
      ) {
        runtimeState.fps =
          message.args && message.args.length ? message.args[0] : null;
      }
      const key = addressToStateKey[message.address];
      if (key) {
        if (message.args.length === 1) {
          runtimeState.snapshot[key] = message.args[0];
        } else {
          runtimeState.snapshot[key] = message.args;
        }
      }
      const semanticBinding = semanticAddressToBinding[message.address];
      if (semanticBinding) {
        applySemanticBinding(semanticBinding, message);
      }
    }
  });

  socket.on("error", (error) => {
    console.error(`OSC socket error: ${error.message}`);
  });

  socket.bind(config.osc.listenPort, config.osc.listenHost, () => {
    if (config.startup && config.startup.apply) {
      const delay = Number(config.startup.delayMs) || 0;
      setTimeout(
        () =>
          applyNamedState(config.startup.state, {
            force: Boolean(config.startup.force)
          }),
        delay
      );
    }
  });

  if (config.watchdog && config.watchdog.enabled) {
    const timeoutMs = Number(config.watchdog.timeoutSec) * 1000;
    setInterval(() => {
      const silentFor = Date.now() - runtimeState.lastOscAt;
      if (!runtimeState.watchdogActive && silentFor > timeoutMs) {
        triggerWatchdogSafeState();
      }
      if (
        runtimeState.watchdogActive &&
        config.watchdog.recoverOnActivity &&
        silentFor <= timeoutMs
      ) {
        runtimeState.watchdogActive = false;
      }
    }, config.watchdog.checkIntervalMs || 500);
  }

  if (config.health && config.health.logIntervalSec) {
    setInterval(logStatus, config.health.logIntervalSec * 1000);
  }

  if (config.panic && config.panic.enabled && !hasFlag("--no-hotkeys")) {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on("data", (chunk) => {
        const key = chunk.toString("utf8");
        if (key === "\u0003") {
          process.exit(0);
        }
        if (
          key.toLowerCase() === String(config.panic.hotkey || "p").toLowerCase()
        ) {
          triggerPanic("hotkey");
        }
      });
    }
  }

  startHealthServer();
};

if (hasFlag("--panic")) {
  applyNamedState(
    (config.panic && config.panic.safeState) || DEFAULT_CONFIG.panic.safeState,
    { force: true }
  );
  setTimeout(() => process.exit(0), 50);
} else {
  initRuntime();
}
