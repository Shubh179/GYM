# Anatomical body model

The on-demand viewer loads `body-optimized.glb` (about 924 KB), replacing the
former MakeHuman display body. Normal browsing uses the front/back WebP previews
(about 14 KB each) and does not load the model or start WebGL.

Source: https://github.com/slfresh/fitmitwith-anatomy-atlas
Revision: 4120ee68b6604b8f2f69105d6de6166fad4734c4
Original file: models/full-body-male-mobile.glb

`body.glb` preserves the unmodified source asset under CC BY-SA 4.0. It includes
218 named muscle regions plus skeletal and connective-tissue context.
`body-optimized.glb` applies Meshopt compression and attribute quantization with
@gltf-transform/cli 4.2.1. The WebP previews are rendered from the same source
with app lighting/colors. The viewer changes display scale, materials and
lighting, batches named structures by training region, and maps source muscle
names to those regions. These adapted model assets, previews and model
presentation adaptations are also offered under CC BY-SA 4.0; this does not
change the app code's license.

Rebuild the compressed asset from the project root:

```powershell
npm.cmd exec --yes --package=@gltf-transform/cli@4.2.1 -- gltf-transform meshopt public/models/anatomy/body.glb public/models/anatomy/body-optimized.glb
```

The root AnatomyProvider owns one persistent, lazy-loaded viewer. Reopening it
reuses its WebGL renderer and prepared geometry. Desktop shadows are computed
once; mobile disables shadows and caps pixel ratio at 1. Geometry is decoded
to float attributes before baking transforms to avoid quantization clamping.
Run `node scripts/test-anatomy-performance.cjs` against the dev/production
server to check deferred requests, renderer reuse, mesh batches, focus/escape,
all muscle groups, mobile resolution and the no-WebGL fallback. Screenshots
and the JSON report default to `../tmp/anatomy-performance/`; override with
`ANATOMY_ARTIFACTS`. This supersedes the eager-viewer expectations in the older
`tests/muscle-guide.cjs`.

Double-tapping a rendered muscle or its label closes the viewer and focuses the
first exercise in the current workout with that exact target. It does not open
the exercise detail page. If there is no match in the current workout (or the
viewer was opened outside a workout), it browses `/search?target=<target-id>`.
Target search returns all exact matches ordered beginner, intermediate, then
advanced/expert; custom/unrated exercises follow. A focused muscle also exposes
a keyboard-accessible "Show exercises" button. Single taps retain selection,
and dragging/pinch gestures do not activate target navigation.
Run `node scripts/test-anatomy-targets.cjs` for session scoping, mesh/label
double-taps, keyboard activation, exact-target filtering and difficulty ordering.

Credits: Z-Anatomy — The libre 3D atlas of anatomy, by Gauthier Kervyn,
Marcin Zielinski and contributors, derived from BodyParts3D by Kousaku Okubo /
The Database Center for Life Science. Mobile model adaptation: Fit Mit With.

See ATTRIBUTION.txt and Z-Anatomy-LICENSE.txt for full upstream credits and
changes, LICENSE.txt for the license, and source.json for provenance.
License: https://creativecommons.org/licenses/by-sa/4.0/

The upstream model has not been independently reviewed by an anatomy specialist.
Highlight colors show training regions, not measured activation.
