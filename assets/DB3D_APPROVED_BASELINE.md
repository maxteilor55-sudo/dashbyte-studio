# DashByte 3D DB — APPROVED DESIGN BASELINE

Approved by studio owner on 2026-11-04, at the 23:10 screenshot in Telegram.

## Non-negotiable approved geometry
- Reference artwork: `assets/DashByte_DB_Official_Vector.svg`.
- Source: three precise SVG subpaths, the authentic overlapping DB signature.
- Geometry: `assets/db-3d-logo.js` produces 502 front triangles, 3 extruded vector parts.
- The approved front silhouette, internal cuts, proportions, extrusion depth `Z=.118`, overall scale `X=.8`, and positioning are **frozen**.
- Never revert to raster alpha-mask extrusion, pixelated walls, filling holes, welding/stitching outlines, or creating a solid slab.
- When changing appearance, modify **only shader/material or interaction controls**, not the triangulation, SVG, or the `makeGeometry()` model.

## Approved interactive finish (requested after screenshot)
- Faces: matte cool medium-gray, without glossy face glare.
- Side/perimeter walls: polished/brushed steel with clean highlights that visibly move as the user rotates.
- Full finger/mouse rotation around horizontal and vertical axes; do not clamp to a small angle.
- Subtle original idle orientation, gentle easing, momentum, and retain manual viewing angle without auto-snapping back.
- On mobile, vertical swipes inside the 3D preview rotate the model (touch-action:none); scrolling outside the preview works normally.
- The surrounding glass frame and client cards must not change.
- Double-click or keyboard Home restores the original front-oriented pose.

This baseline exists so future maintenance protects the approved visual, rather than repeatedly redesigning the logo.
