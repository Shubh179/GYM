# RepVisual — Codebase Guide

RepVisual is an exercise browser and personal training planner built with Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion, Three.js, Fuse.js and Supabase.

The bundled catalog has 876 exercises, including 873 with start/finish photo pairs. Exercises come only from the dataset or manually created custom records. Missing exercise pages show a normal not-found screen; missing API lookups return HTTP 404. Search never generates exercise records.

See [README.md](README.md) for setup, environment variables, deployment and license links.

## Architecture

The root layout mounts `AuthProvider`, `ProfileProvider`, `LibraryProvider`, `TimerProvider` and `AnatomyProvider`. Supabase Auth supplies JWT sessions; the library remounts on account changes to isolate training data. The remaining providers keep timers and anatomy available across route navigation.

Server routes read the bundled catalog and custom metadata. Supabase supplies shared custom exercises, admin authorization and private per-user training snapshots. Personal sync uses the public client key plus the signed-in user's JWT and RLS, never the server secret.

## Routes

| Route | Behavior |
| --- | --- |
| `/` | Authentication landing page for visitors; restored sessions go directly to `/library`. |
| `/library` | Workout sessions, weekly schedule, progress/history, notes and anatomy previews. Sessions start collapsed and expand individually. |
| `/search` | Fuzzy catalog search, broad-muscle filtering or exact-target browsing, with manual custom-exercise creation. |
| `/exercise/[slug]` | Dataset/custom exercise details, photo demonstrations where available, YouTube videos, instructions, notes and anatomy. Unknown slugs use the segment's `not-found.tsx`. |
| `/favourites` | Browser-local favourite exercises. |
| `/timer` | Full stopwatch and rest-timer interface. |
| `/profile` | Protected minimal profile with photo upload, unique username, received sessions and logout. |
| `/account` | Public sign-in/OAuth callback retained for existing Supabase redirect configuration; signed-in visits forward to `/profile` unless completing sign-in to `/library`. |

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

There is no exercise or video generation pipeline. The former generation routes, SDKs, pose renderer, loading screens, generated-record types, disk cache and API-key settings have been removed.

## Personal training state

`src/lib/library.tsx` owns workouts, weekly scheduling, favourites, exercise progress, completion history and personal notes. `use-training-sync.ts` saves a device cache immediately and debounces signed-in cloud sync by 700 ms. It also refreshes on focus, reconnect and every 30 seconds.

- App access requires sign-in. Records sync through `personal_training`, whose primary key is `auth.users.id`. `personal-training.sql` at the repository root creates the table, owner-only RLS policies and the revision-checked `save_personal_training` RPC. It must be applied in the Supabase SQL editor; it has not been applied automatically.
- The first account on a browser claims legacy `repvisual:library:v1` and `repvisual:weekly-schedule:v1` data. Both original keys are retained. Subsequent accounts cannot import that claimed data. Per-account caches use `repvisual:library:user:<id>:v2`; signed-out use after a claim uses a separate guest cache.
- Three-way merging combines independent changes by workout/history ID and exercise slug, respects non-conflicting deletions, and retains both versions of conflicting note/schedule text. Revision conflicts reload/merge/retry rather than replacing newer cloud data. Offline/failed sync keeps the cache and retries on reconnect/focus; the minimal Profile does not expose sync controls.
- A sync batch pins its JWT to the initiating user so an account switch cannot write old account data to the new account. History remains a snapshot. Timer state remains device-local.
- Workout completion records the exercises actually marked done; partial sessions do not automatically mark every exercise complete.
- Undoing a recorded session restores the prior exercise selection for editing.
- Exercise completion buttons remain editable after recording a session. Changing one first restores the recorded selection and removes that session's current-day history/heatmap entry, then toggles the selected exercise. Other checked exercises remain selected; completing the selection again records one session without duplication. `workout-completion.ts` owns these transitions; `node workout-completion.test.cjs` checks completion/undo/recheck and partial sessions.
- Workout history contains exercise snapshots. Later custom-exercise edits update current saved metadata without rewriting old history.
- Notes and membership remain attached to stable exercise slugs.
- Custom metadata refresh runs on hydration and window focus. A failed strict refresh retains the existing browser snapshots.

`WorkoutHeatmap.tsx` displays training history. `SyncedWeeklySchedule.tsx` manages the shared schedule; the older `WeeklySchedule.tsx` is no longer imported. `QuickNotes.tsx` and the session note controls edit personal notes.

For Google login enable the Google provider in Supabase Authentication, configure its Google OAuth client ID/secret, use the Supabase callback URL as the Google authorized redirect URI, and allow each app origin's `/account` URL in Supabase Auth redirect settings. The existing browser Supabase client manages the OAuth callback, JWT persistence and automatic refresh. Email confirmation returns to `/account` too.

The homepage shows authentication first. Successful email sign-in goes to `/library`; Google sign-in records a tab-local return destination and keeps the existing `/account` callback URL before forwarding to `/library`. Signed-in users open `/profile` for photo uploads, username setup, received sessions and logout; `/account` forwards there. Only `/`, `/account`, and `/privacy-policy` are public app routes. Signed-out navigation and data export are hidden, and logout returns to `/`.

The installed Supabase browser client already defaults to persistent sessions and automatic access-token refresh. `AuthProvider` mirrors token rotations into the access-token cookie. On a server-rejected token at the login boundary, it tries `refreshSession()` before requiring credentials, rather than signing out and discarding the stored refresh token. Temporary refresh failures retain the SDK session for retry. `node session-refresh.test.cjs` checks recovery and subsequent token/sign-in events.

`src/middleware.ts` checks protected page, RSC, API and model requests with Supabase `auth.getUser(token)`, using a Bearer header or a short-lived access-token cookie maintained by `AuthProvider`. It redirects unauthenticated pages to login, returns 401 for APIs, rejects forged/invalid tokens and returns 503 if verification is unavailable. It never trusts cookie presence or client state as authentication. Required Next.js assets and discovery files are excluded. `AuthGate.tsx` unmounts app navigation/timer/anatomy for signed-out users and prevents cached-route UI from remaining accessible. The privacy policy remains server-rendered and public.

`node auth-guard.test.cjs --browser` starts a separate fixture app on port 3012 with a local mock Supabase auth verifier, then exercises guest route/API restrictions and the signed-in migration/sync flows. It does not configure a production bypass or contact the real database.

`node training-sync.test.cjs` tests migration/backup/isolation and merge rules. `node training-sync.test.cjs --browser` uses isolated Chrome contexts and intercepts Supabase Auth/database requests to test import, autosave, conflicts, offline recovery, account switching, Google redirect and another-device restore. These mocks do not verify live database policies or a real Google login.

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

Browse offers a muscle-region selector and separate beginner, intermediate, advanced (including expert), and unrated/custom sections. Each initially shows up to three cards with an independent View all/Show fewer control. Text queries retain relevance ordering. `mode=browse` returns the complete catalog, and muscle browsing returns all matches so difficulty groups are not truncated by the ordinary search limit.

The server caches the merged catalog for 30 seconds and reuses a Fuse index plus difficulty-sorted muscle/target lookup maps. Concurrent reads share the catalog promise. Successful custom creation/editing invalidates that server instance immediately; other instances refresh on expiry. Strict custom metadata refresh remains uncached.

`byTarget` returns all exact matches without the ordinary 48-record cutoff. `sortByDifficulty` orders beginner, intermediate, advanced/expert, then custom/unrated records, preserving the prior order within a tier.

The search page shows the target/order, aborts stale fetches, handles API errors and keeps newly created exercises within the active target filter. When no exact target records exist, the API returns all related primary-muscle exercises sorted by difficulty and includes `relatedMuscle`; browse explains that their specific region emphasis is unspecified. This fallback does not change target metadata or session-card matching. Empty results offer catalog browsing and manual creation, not generated content.

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

## Demonstrations and timers

- `MovementViewer.tsx` animates real dataset photo pairs with play/pause, speed and scrubbing. Missing pairs show a photo-unavailable state; there is no generated pose fallback.
- `ExerciseView.tsx` renders dataset/custom details, actions, target labels, anatomy, personal notes, instructions and YouTube demonstrations. Custom exercises use their manually linked YouTube video.
- `youtube.ts` resolves existing videos through cached IDs, an optional YouTube API key, or keyless resolution. Only video metadata is cached under `data/videos/` or temporary storage on read-only deployments. `youtube-embed.ts` builds embed URLs.
- `timer.tsx` persists stopwatch/rest-timer state under `repvisual:timer:v1`. `FloatingTimer.tsx` keeps it usable during navigation; provider behavior is shared with `/timer`.

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
- `node tests/supabase-storage.cjs`: isolated storage and authorization checks without production writes.

The anatomy scripts support `TEST_BASE_URL`, `CHROME_PATH` and `ANATOMY_ARTIFACTS`. Default artifacts go to `../tmp/anatomy-performance/` and `../tmp/anatomy-targets/`. The target script also supports `TARGET_WIDTHS`. More tests are listed in `tests/README.md`.

## Cleanup and delivery progress

Removed unused `Hero.tsx`, `MonthlyHeatmap.tsx`, `SpotifyProvider.tsx`, the MakeHuman model pipeline/assets, unused integration helpers/imports, unused viewer state/animation branches, and obsolete anatomy explanation fields. The active source model and required licensing/provenance remain.


Feature commits already created locally:

| Commit | Progress |
| --- | --- |
| `291befa` | Z-Anatomy replacement body and muscle guide. |
| `0040ae2` | On-demand shared viewer, optimized model and specific card labels. |
| `57a685e` | Session jumps and sorted target browsing from muscle double taps. |

The subsequent cleanup and catalog-only changes are working-tree progress. The last GitHub push attempt failed because the session could not access GitHub credentials; successful remote synchronization has not been verified.


## Music removal

Music navigation and the app-wide player provider have been removed. The floating timer uses a fixed bottom offset and no longer depends on player state. Music-only styles and the RapidAPI example setting have been removed. `/music`, `/spotify` and `/api/music-test` return 404 from middleware. Exercise YouTube demonstrations remain supported.

Filesystem permissions currently prevent deleting the retired music route files, player/test components, Spotify helper and music-preservation test, and prevent updating the affected browser tests. Those files remain on disk pending deletion; the player is no longer mounted by the app.

Browse difficulty groups render at most 24 cards per expanded group page, with Previous/Next controls. Cards disable route prefetching and entrance animations and use asynchronous image decoding.

Profile is the fifth main navigation destination. Logout clears the local Supabase session and access-token cookie before returning to `/`. Existing `/account` OAuth and email callbacks remain compatible. The old signed-in account statistics, sync controls and backup controls are no longer shown.

## Profiles and workout sharing

Run `profile-sharing.sql` in Supabase SQL Editor after `personal-training.sql`. This root-level migration is idempotent and transactional. The user applied it in the live Supabase SQL Editor. Read-only verification confirmed both table schemas, the username RPC, anonymous-access rejection and the private photo bucket with its MIME/2 MB limits. Live signed-in delivery and uploads have not been exercised by this session. The protected migrations directory rejected new files, so the script follows the existing root-level SQL convention.

- `profiles`: per-user lowercase unique usernames and private avatar paths. RLS exposes only the caller's row. `claim_username` assigns a username once; uniqueness is enforced by Postgres, including concurrent claims.
- Email registration checks availability then includes the username in signup metadata. The auth-user trigger reserves it in the same transaction as account creation. Google sign-ins and legacy users without a username finish onboarding on Profile before continuing to the app.
- `profile-photos`: private bucket with owner-folder read/upload/delete policies and JPG/PNG/WebP, 2 MB limits. Uploads are cropped to a 512px JPEG in the browser, saved under an unguessable owner path, and displayed using hour-long signed URLs. Replacement removes the prior photo after updating the profile.
- `workout_shares`: immutable snapshots readable only by their recipient. `send_workout` resolves the recipient's unique username, requires both users to have usernames, forbids self-sharing, validates payloads and caps sends at 30/hour. Definer functions use a fixed empty search path and restricted execute grants. Snapshots whitelist session names and exercise metadata; notes, history, schedule and progress never leave the sender's library.
- `ShareWorkout.tsx` supplies per-session sharing and Share all sessions on My Training. Empty sessions cannot be shared; batches are limited to 50 sessions/100 exercises each and 1 MB.
- `UserProfile.tsx` loads 20 received shares at a time, refreshes on focus/every minute, previews exercises and imports independent copies. `sharing-client.ts` pins each request to the initiating user JWT and rejects account switches. Stable IDs based on share ID/session index make repeated imports idempotent. `addReceivedWorkouts` persists the account's local cache before reporting success; existing training sync saves imports across devices. A recipient's edits do not change the sender's workout.
- `workout-sharing.test.cjs`: validation, snapshot privacy, independent copies, duplicate/partial imports and preservation of unrelated training state.
- `profile-sharing.browser.cjs`: isolated mocked two-account app checks, signup/legacy username flows, photo upload, one/all session delivery, import persistence, mobile widths and logout. Artifacts are written to `../tmp/profile-sharing/`. This does not verify live Supabase RLS or storage setup.
