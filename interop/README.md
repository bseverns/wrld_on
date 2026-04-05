# Interop Consumer Files

`wrld_on` consumes authority artifacts from `live-rig`; it does not own the rig contract.

Files in this folder have separate jobs:

- `exports/live-rig.default.json`
  - mirrored runtime snapshot copied from the `live-rig` authority repo
- `rig.profile.schema.json`
  - schema used to validate the mirrored runtime snapshot
- `interop.schema.json`
  - mirrored authority transport schema from `live-rig`
- `workspace-controls.schema.json`
  - local schema for optional workspace-specific control profile JSON

Sync the mirrored authority artifacts with:

```bash
npm run sync:rig-profile
```

Validate this repo's consumer wiring with:

```bash
npm run validate
```
