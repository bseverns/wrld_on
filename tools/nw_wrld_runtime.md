# nw_wrld runtime wrapper

Minimal OSC runtime guard for safe startup, watchdog, health logging, and panic.

## Usage

```bash
node tools/nw_wrld_runtime.js
```

Custom config:

```bash
node tools/nw_wrld_runtime.js --config nw_wrld_data/json/runtimeConfig.json
```

One-command panic:

```bash
node tools/nw_wrld_runtime.js --panic
```

## Hotkey

When running in a terminal, press `p` to trigger panic (configurable).

## Health endpoint

If `health.httpPort` is set, JSON is served at:

```
http://localhost:<port>/health
http://localhost:<port>/state
```
