# wrld_on

Workspace repo for custom `nw_wrld` modules.

## Quick start

1. Open this folder as a project in `nw_wrld`.
2. Add a module from the Dashboard dropdown.
3. Edit files in `modules/` and save to hot-reload.

## Project layout

- `modules/` - workspace modules loaded by `nw_wrld`
- `assets/` - images/models/data used by modules
- `nw_wrld_data/` - project data used by the app
- `MODULE_DEVELOPMENT.md` - module contract + SDK reference

## Custom modules (recent additions)

- `modules/PulseField.js` - 2D pulsing dot field inspired by `dataVis/sketch_150115a_pulse`
- `modules/WaveGate.js` - 2D wave-gated grid inspired by `dataVis/sketch_150115c_wave`
- `modules/RotatingSpheres.js` - 3D rotating spheres ring inspired by `dataVis/RotatingSpheres_ex`

## Notes

- Modules are plain JS files (no build step).
- Each module must include the `@nwWrld` docblock and export default.
- See `MODULE_DEVELOPMENT.md` for method options, assets, and SDK details.
