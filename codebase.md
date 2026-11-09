# RepVisual — Codebase Guide

RepVisual is an exercise browser and personal training planner built with Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion, Three.js, Fuse.js and Supabase.

The bundled catalog has 876 exercises, including 873 with start/finish photo pairs. Exercises come only from the dataset or manually created custom records. Missing exercise pages show a normal not-found screen; missing API lookups return HTTP 404. Search never generates exercise records.

See [README.md](README.md) for setup, environment variables, deployment and license links.

## Architecture

The root layout mounts `LibraryProvider`, `TimerProvider`, `MusicProvider` and `AnatomyProvider`. These keep browser-local training state, the stopwatch/rest timer, EchoPlay playback and the shared anatomy viewer available across client-side route navigation.

Server routes read the bundled catalog and custom metadata. Supabase supplies shared custom exercises and admin authorization; it does not store personal workouts, notes or workout history.

## Routes

| Route | Behavior |
| --- | --- |
| `/` | Redirects to `/library`. |
| `/library` | Workout sessions, weekly schedule, progress/history, notes and anatomy previews. Sessions start collapsed and expand individually. |
| `/search` | Fuzzy catalog search, broad-muscle filtering or exact-target browsing, with manual custom-exercise creation. |
| `/exercise/[slug]` | Dataset/custom exercise details, photo demonstrations where available, YouTube videos, instructions, notes and anatomy. Unknown slugs use the segment's `not-found.tsx`. |
| `/favourites` | Browser-local favourite exercises. |
| `/timer` | Full stopwatch and rest-timer interface. |
| `/music` | EchoPlay controls, plus the separate in-progress audio-test experiment. |
| `/spotify` | Compatibility redirect to `/music`. |

## Exercise catalog and APIs

`src/lib/exercises.ts` loads and normalizes `data/exercises.json`, merges custom records, runs Fuse.js search and exposes list/filter helpers. Normalization retains explicit `targetAreas`. Exercise types in `src/lib/types.ts` distinguish only dataset and custom sources.

| API | Behavior |
| --- | --- |
| `GET /api/exercises?q=...` | Fuzzy catalog search; ordinary results default to a 48-record limit. |
| `GET /api/exercises?muscle=...` | Broad primary-muscle filter. |
| `GET /api/exercises?target=...` | All exact target matches, sorted by difficulty. Unknown/empty target IDs return 400. |
| `GET /api/exercises?mode=popular` | Curated exercise suggestions. |
| `GET /api/exercises?mode=muscles` | Available primary-muscle names. |
| `GET /api/exercises?mode=custom` | Strict custom metadata refresh; returns 503 on remote-storage failure. |
| `POST /api/exercises` | Validate and create a manually entered custom exercise, with publishing authorization. |
| `GET /api/exercise/[slug]` | Return an existing exercise or 404; no generated-record/cache lookup. |
| `PATCH /api/exercise/[slug]` | Update a custom exercise while retaining its slug and ID. Built-in records cannot be edited. |
| `/api/exercise-access` | Report sign-in/publishing access for custom exercise controls. |
| `/api/music-test` | Separate in-progress one-song audio-provider experiment. |

There is no exercise or video generation pipeline. The former generation routes, SDKs, pose renderer, loading screens, generated-record types, disk cache and API-key settings have been removed.

## Personal training state

`src/lib/library.tsx` stores workouts, weekly scheduling, favourites, exercise completion, completion history and personal notes in browser localStorage under `repvisual:library:v1`.

- These records are local to the browser/origin and do not sync across devices or browsers.
- Workout completion records the exercises actually marked done; partial sessions do not automatically mark every exercise complete.
- Undoing a recorded session restores the prior exercise selection for editing.
- Workout history contains exercise snapshots. Later custom-exercise edits update current saved metadata without rewriting old history.
- Notes and membership remain attached to stable exercise slugs.
- Custom metadata refresh runs on hydration and window focus. A failed strict refresh retains the existing browser snapshots.

`WorkoutHeatmap.tsx` displays training history. `WeeklySchedule.tsx` manages the schedule. `QuickNotes.tsx` and the session note controls edit personal notes.

## Specific muscle targets

`src/lib/muscle-targets.ts` contains the target catalog, validation, target-to-muscle mapping, display labels, difficulty sorting and conservative inference for recognizable dataset variants.

Explicit targets always win, including an explicit empty list for unknown emphasis. Incline chest presses/flyes can map to upper chest, decline variants to lower chest, and recognizable flat variants to middle chest. Broad chest or arm membership alone does not identify an individual region or muscle head.

`muscle-overlap.ts` compares exact target IDs when adding an exercise to a session. The confirmation lists shared targets and exercises; cancel leaves membership unchanged. The same library logic serves the inline picker and exercise-detail actions.

Cards display specific target labels with equipment, or **Target unspecified**. Dataset `expert` levels display as **advanced**.

## Anatomy viewer

### Preview and shared lifecycle

`MuscleGuide.tsx` displays a lightweight front/back image and **Explore in 3D**. Opening a workout or exercise page does not start WebGL or download the model.

`AnatomyProvider.tsx` owns the current request and open state. On demand it loads `AnatomyExplorer.tsx`, which supplies one persistent modal and `MuscleBody3D.tsx` renderer for all sessions/pages. Closing hides and pauses the viewer; route navigation also closes it. Reopening reuses the renderer and prepared geometry.

The guide derives a session's group from its name or exercises, and an exercise page's group from its targets/primary muscles. There is no body-part switcher. The eight groups are Chest, Back, Biceps, Triceps, Shoulders, Forearms, Abs and Legs. `muscle-guide.ts` defines 27 displayed regions with labels, colors, preferred views and fallback anchors.

### Geometry and performance

The source is the Fit Mit With Z-Anatomy / BodyParts3D mobile atlas, pinned to revision `4120ee68b6604b8f2f69105d6de6166fad4734c4`. It has 221 meshes, including 218 named muscle regions plus skeleton/connective context.

`muscle-body.ts` maps named structures to training targets. A single prepared-model promise caches the asset load, parsing and preparation. Quantized attributes are decoded to float buffers before transforms are baked, avoiding vertex clamping. Constituent meshes are batched by selectable target, with neutral tissue grouped by material color. Per-view materials can change without mutating the cached template.

| Asset or rendering measure | Current value |
| --- | --- |
| Original `body.glb` | 2,545,068 bytes; retained for provenance/rebuilding. |
| Active `body-optimized.glb` | 923,748 bytes, approximately 64% smaller. |
| Front/back WebP previews | 14,466 / 13,646 bytes. |
| Draw calls in browser checks | 39 per frame. |
| Mobile/coarse-pointer pixel ratio | Capped at 1; shadows disabled. |
| Desktop pixel ratio | Capped at 1.5; static shadows computed once. |

Rendering is event-driven, with no pulse animation or idle frame loop. Closed, offscreen and document-hidden views skip rendering. Unsupported WebGL shows a dismissible fallback. Asset size and draw-call reductions do not promise a particular load time on every device.

Model assets, previews, notices and rebuild instructions are under [public/models/anatomy](public/models/anatomy/README.md). The source and adaptations remain CC BY-SA 4.0; required credits are retained. The model has not been independently reviewed by an anatomy specialist, and highlight colors show training emphasis rather than measured activation.

### Double-tap navigation

Single taps select a muscle. A double-click/double-tap on the same muscle or label finds exercises for that exact target:

1. `AnatomyRequest.sessionId` identifies the originating workout.
2. The explorer checks that workout's current exercises through `useLibrary`; other sessions do not count.
3. If a match exists, it closes the modal and scrolls to/focuses the first matching session card. It does not open the detail page.
4. If no match/card/session exists, or the viewer opened outside a workout, it navigates to `/search?target=<target-id>`.

Workout/card data attributes scope the focus destination. Navigation does not change membership, notes, completion or target metadata. Keyboard users can select a label and use **Show exercises for ...**.

Gesture recognition requires the same target and nearby pointer positions within 400 ms. It uses native input timestamps. Dragging, pointer cancellation and multi-pointer interaction clear tap tracking.

### Target browse ordering

`byTarget` returns all exact matches without the ordinary 48-record cutoff. `sortByDifficulty` orders beginner, intermediate, advanced/expert, then custom/unrated records, preserving the prior order within a tier.

The search page shows the target/order, aborts stale fetches, handles API errors and keeps newly created exercises within the active target filter. Empty results offer catalog browsing and manual creation, not generated content.

## Custom exercises and Supabase

`custom-exercises.ts` reads shared Supabase records and bundled `data/custom/` records. Successful configured saves/edits go to Supabase. Development without Supabase can write local JSON; production publishing requires configured storage and authorization.

`custom-exercise-input.ts` validates names, YouTube links and specific target IDs. Broad primary muscles are derived from selected targets. Old unlabelled custom records remain unspecified until manually edited.

Required configuration:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (server-only)
- `CUSTOM_EXERCISE_ADMIN_EMAIL`

Public reads use the publishable key and public-read RLS policy. The server validates the bearer token through Supabase Auth and checks the confirmed email against the configured admin before privileged writes. Browser clients cannot insert/update directly through RLS. Anonymous/other-user/missing-configuration publishing requests return 401/403/503 respectively.

Apply both migrations in order:

1. `202611020001_custom_exercises.sql`
2. `202611090001_custom_exercise_primary_muscles.sql`

The second migration adds `primary_muscles` and `target_areas` without inventing targets for existing rows. The import script supports `--dry-run`, retains local files and preserves existing slugs.

## Demonstrations, timers and music

- `MovementViewer.tsx` animates real dataset photo pairs with play/pause, speed and scrubbing. Missing pairs show a photo-unavailable state; there is no generated pose fallback.
- `ExerciseView.tsx` renders dataset/custom details, actions, target labels, anatomy, personal notes, instructions and YouTube demonstrations. Custom exercises use their manually linked YouTube video.
- `youtube.ts` resolves existing videos through cached IDs, an optional YouTube API key, or keyless resolution. Only video metadata is cached under `data/videos/` or temporary storage on read-only deployments. `youtube-embed.ts` builds embed URLs.
- `timer.tsx` persists stopwatch/rest-timer state under `repvisual:timer:v1`. `FloatingTimer.tsx` keeps it usable during navigation; provider behavior is shared with `/timer`.
- `MusicProvider.tsx` owns the persistent EchoPlay iframe and its measured dock height. The floating timer accounts for the player so the docks do not overlap.
- The separate one-song audio test uses `RAPIDAPI_KEY`; it remains unrelated in-progress work. No music-provider key is needed for normal EchoPlay use.

## Scripts, build and verification

Requires Node.js 22.x. Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.

| Command | Purpose |
| --- | --- |
| `npm run setup` | Fetch the dataset; no generated-exercise directory is created. |
| `npm run dev` | Run the app locally, normally on port 3000. |
| `npm run typecheck` | TypeScript checks with unused locals/parameters rejected. |
| `npm run build` | Production compilation, type checking and static-page generation. |
| `npm run start` | Serve the production build. |
| `npm run db:import-exercises -- --dry-run` | Validate custom imports without writes. |

Set `NEXT_DIST_DIR=.next-production` when building separately from a running development server; the default is `.next`. Both output directories are ignored. In a restricted execution environment, `JITI_CACHE=false` avoids writes to a protected system-temp TypeScript-config cache.

`vercel.json` uses the Next.js preset, `npm ci` and `npm run vercel-build`. Runtime tracing includes dataset files for active catalog routes. Browser-local training data does not require a database; shared custom publishing uses Supabase. Temporary serverless video-metadata caches are not persistent user storage.

Run browser checks against a running server:

- `node scripts/test-anatomy-performance.cjs`: deferred loading, renderer reuse, all groups, resolution, draw calls, focus/Escape and no-WebGL fallback.
- `node scripts/test-anatomy-targets.cjs`: session scoping, mesh/label double-taps, keyboard activation, exact-target filtering and difficulty order.
- `node tests/music-preservation.cjs`: workout/history/notes/timer preservation across music navigation.
- `node tests/supabase-storage.cjs`: isolated storage and authorization checks without production writes.

The anatomy scripts support `TEST_BASE_URL`, `CHROME_PATH` and `ANATOMY_ARTIFACTS`. Default artifacts go to `../tmp/anatomy-performance/` and `../tmp/anatomy-targets/`. The target script also supports `TARGET_WIDTHS`. More tests are listed in `tests/README.md`.

## Cleanup and delivery progress

Removed unused `Hero.tsx`, `MonthlyHeatmap.tsx`, `SpotifyProvider.tsx`, the MakeHuman model pipeline/assets, unused integration helpers/imports, unused viewer state/animation branches, and obsolete anatomy explanation fields. The active source model and required licensing/provenance remain.

Deletion was blocked for the unreferenced `src/lib/spotify.ts` and obsolete `tests/muscle-guide.cjs`. They remain on disk; use the current anatomy scripts instead of the old eager-viewer test.

Feature commits already created locally:

| Commit | Progress |
| --- | --- |
| `291befa` | Z-Anatomy replacement body and muscle guide. |
| `0040ae2` | On-demand shared viewer, optimized model and specific card labels. |
| `57a685e` | Session jumps and sorted target browsing from muscle double taps. |

The subsequent cleanup and catalog-only changes are working-tree progress. The last GitHub push attempt failed because the session could not access GitHub credentials; successful remote synchronization has not been verified.
