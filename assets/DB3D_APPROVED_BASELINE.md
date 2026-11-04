# DashByte 3D DB — APPROVED DESIGN BASELINE

Approved by studio owner on 2026-11-04, at the 23:10 screenshot in Telegram.

## Non-negotiable approved geometry
- Reference artwork: `assets/DashByte_DB_Official_Vector.svg`.
- Source: three precise SVG subpaths, the authentic overlapping DB signature.
- Geometry: `assets/db-3d-logo.js` produces 502 front triangles, 3 extruded vector parts.
- The approved front silhouette, internal cuts, proportions, extrusion depth `Z=.118`, overall scale `X=.8`, and positioning are **frozen**.
- Never revert to raster alpha-mask extrusion, pixelated walls, filling holes, welding/stitching outlines, or creating a solid slab.
- When changing appearance, modify **only shader/material or interaction controls**, not the triangulation, SVG, or the `makeGeometry()` model.

## Current showroom Liquid Glass finish (requested 2026-11-04 at 23:24)

- The approved vector mesh and all its original curves, counters, outlines, depth `Z=.118`, and geometry are frozen. Never rebuild them just to change the look.
- **No automatic zoom or change of camera position with rotation.** The camera uses **orthographic projection** with fixed scale `1.04` at every angle: no depth-based perspective growth, auto-fit, pan or zoom during drag. The obsolete `projectionFit()` function must not return.
- Full intuitive two-axis finger and mouse rotation with optional inertia. Idle tilt is subtle until manually handled; manual view does not auto-reset.
- The 3D DB is **light silvery frosted Liquid Glass**, softly translucent with neutral white refraction-like studio reflections along its edges; it should be bright enough to read against video.
- The 3D viewport inherits optical styling inspired by Arsenal V9's single glass navigation shell (neutral translucent surface, soft blur, rim reflections).
- The four client tiles are true CSS backdrop-filter frosted-glass panels with *delicate accent edges*: Arthur red; Green Collection green; PERM–VL cool blue; Arsenal graphite/bronze.
- All four cards keep their existing content, progress indicators, PIN actions, project links, current order and grid layout. No opaque heavy color blocks.
- Implemented in `assets/db-showroom-liquid-glass.css` (v2 optical glass) and the **material, orthographic camera and controls** section of `assets/db-3d-logo.js`.
- Native CSS backdrop-filter blurs the page video behind the cards and the 3D viewport. WebGL uses optical reflections/transparency for the rotating mesh; it cannot itself sample and blur arbitrary DOM behind the canvas.
- Test seven rendered 3D poses including steep diagonal, full finger/mouse motion, four card blur styles and the mobile 2×2 above-fold layout before publishing.

This specification supersedes the former matte-metal-only material requirement. The official geometry and silhouette do **not** change.
