# wrld_on

Workspace repo for custom `nw_wrld` modules.

In the shared rig topology, `wrld_on` is a workspace consumer layered on top of `nw_wrld`. It does not own canonical scene naming, transport doctrine, or the authority interop contract.

## Quick start

1. Run `npm install` once for the local validation tools.
2. Run `npm run sync:rig-profile` to mirror the current `live-rig` runtime snapshot.
3. Open this folder as a project in `nw_wrld`.
4. Add a module from the Dashboard dropdown.
5. Edit files in `modules/` and save to hot-reload.

## Project layout

- `modules/` - workspace modules loaded by `nw_wrld`
- `assets/` - images/models/data used by modules
- `nw_wrld_data/` - project data used by the app
- `interop/` - mirrored `live-rig` consumer artifacts plus workspace-local control schema
- `MODULE_DEVELOPMENT.md` - module contract + SDK reference
- `tools/` - runtime wrapper, sync, and validation scripts

## Custom modules (recent additions)

- `modules/PulseField.js` - 2D pulsing dot field inspired by `dataVis/sketch_150115a_pulse`
- `modules/WaveGate.js` - 2D wave-gated grid inspired by `dataVis/sketch_150115c_wave`
- `modules/RotatingSpheres.js` - 3D rotating spheres ring inspired by `dataVis/RotatingSpheres_ex`

## Notes

- Modules are plain JS files (no build step).
- Each module must include the `@nwWrld` docblock and export default.
- See `MODULE_DEVELOPMENT.md` for method options, assets, and SDK details.

## Interop Consumer Workflow

- `live-rig` remains the authority repo for contract vocabulary and exported snapshots.
- `interop/exports/live-rig.default.json` is the mirrored runtime profile consumed here.
- `nw_wrld_data/json/runtimeConfig.json` maps shared semantic OSC addresses onto local runtime commands.
- `interop/workspace-controls.schema.json` is only for optional workspace-specific control-profile JSON; it is not the authority transport schema.

## Validation

- `npm run sync:rig-profile`
- `npm run validate:rig-profile`
- `npm run validate:workspace-wiring`
- `npm run validate`
