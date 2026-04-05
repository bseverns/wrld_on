# Migrations for Workspace Control Profiles

This file describes the optional local `workspace-controls.json` format validated by `interop/workspace-controls.schema.json`.

It does not replace the mirrored authority snapshot in `interop/exports/live-rig.default.json`.

## Toggle OSC mappings that only send `[1]`

Legacy toggle pads in `workspace-controls.json` that only include:

```json
{
  "osc": { "address": "/some/address", "args": [1] },
  "toggle": true
}
```

should now be expressed with explicit on/off arguments:

```json
{
  "osc": { "address": "/some/address", "onArgs": [1], "offArgs": [0] },
  "mode": "toggle"
}
```

Notes:
- `toggle: true` remains supported, but `mode: "toggle"` is the preferred, explicit form.
- Use the off payload that your endpoint expects. `[0]` is the typical off value.

## Toggle MIDI mappings with implicit values

For CC toggles in `workspace-controls.json` that only sent a single value:

```json
{
  "midi": { "type": "cc", "channel": 1, "cc": 12, "onValue": 127 },
  "toggle": true
}
```

add the explicit off value:

```json
{
  "midi": { "type": "cc", "channel": 1, "cc": 12, "onValue": 127, "offValue": 0 },
  "mode": "toggle"
}
```

For note toggles, add `offVelocity` (typically `0`) alongside `onVelocity`.

## Exclusive (radio) groups

To enable exclusive selection, replace a string `group` with the object form:

```json
{
  "group": { "id": "scene", "mode": "exclusive" }
}
```

This keeps group labels compatible while making the exclusivity explicit.

## Versioning

Optionally set `interopVersion` at the top level (e.g. `"1.0.0"`) to help track schema changes.
