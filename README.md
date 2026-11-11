# RepVisual

A gym exercise browser and training planner with movement demonstrations, specific muscle targets, and on-demand 3D anatomy.

The bundled dataset contains **876 exercises**, including **873 with start/finish photo pairs**. Core browsing, workouts, notes, and timers work without API keys.

Exercises come from the bundled catalog and manually created custom records. Missing exercises show a normal not-found page; search does not generate new exercises.

## Features

- **Exercise demonstrations:** start/finish photo animation with playback speed and scrubbing, technique steps, equipment, and YouTube demonstrations.
- **Training planner:** custom sessions, weekly scheduling, favourites, exercise completion, workout history, heatmaps, and personal notes.
- **Specific muscle targets:** cards show Upper chest, Lower chest, Lats, deltoid regions, and other recorded targets. Unknown targets remain unspecified. Adding overlapping targets to a session prompts a confirmation.
- **On-demand 3D anatomy:** lightweight previews load first. **Explore in 3D** opens one shared anatomical viewer with red muscle tissue, named callouts, rotation, zoom, and front/back controls.
- **Double-tap navigation:** double-click or double-tap a muscle or its label to focus the first matching exercise in the current session, without opening its detail page. If there is no session match, browse that exact target instead.
- **Difficulty-ordered target browsing:** beginner, intermediate, then advanced; unrated/custom exercises follow. Dataset `expert` records display as advanced.
- **Custom exercises:** create and edit YouTube-linked exercises with specific target metadata. Supabase supports shared storage and admin-only publishing.
- **Timers and music:** persistent stopwatch/rest timer and an EchoPlay player that stays mounted during navigation.

## Quick start

Requires **Node.js 22.x** and npm. Run from the repository root:

```bash
npm ci
npm run setup
npm run dev
```

Open [localhost:3000](http://localhost:3000). Visitors see sign-in first; signed-in users and successful logins go to **My Training** at `/library`. The header's **Account** link opens account/sync controls. Exercise browsing and the privacy policy remain publicly accessible.

On Windows PowerShell, use `npm.cmd` instead of `npm` if script execution policy blocks `npm.ps1`.

No environment file is needed for core browsing. For optional integrations, copy [.env.example](.env.example) to `.env.local`, fill in the relevant values, and restart the server.

## Using anatomy navigation

1. Expand a workout session and choose **Explore in 3D**.
2. Single-tap a muscle or label to select it.
3. Double-tap it to find exercises for that specific target.

A session match closes the viewer, scrolls to the exercise card, and focuses it. Matching uses the current session's target metadata; exercises in other sessions do not count. Multiple matches resolve to the first exercise in session order.

Without a match, the app opens `/search?target=upper-chest` or the corresponding target. Results include all exact matches in difficulty order, rather than widening the filter to a broad muscle group. Keyboard users can select a label and activate **Show exercises for ...**.

Explicit target metadata takes precedence. Conservative fallback rules identify recognizable dataset variants, such as incline presses, while ambiguous exercises stay unclassified. Target labels describe training emphasis rather than muscle isolation.

### Rendering performance

- The shared viewer and model load only after an explicit exploration request.
- Front/back previews are approximately **14 KB** each.
- Meshopt compression reduces the model from **2.55 MB to 924 KB**, approximately **64% smaller**.
- Prepared geometry and the WebGL renderer are reused when switching sessions or reopening the viewer.
- Mesh batching produces **39 draw calls** in the browser checks.
- Mobile rendering caps pixel ratio at 1 and disables shadows. Desktop caps it at 1.5 and computes static shadows once.
- Closed, hidden, and offscreen viewers skip rendering. Unsupported WebGL has a dismissible fallback.

These figures describe asset size and verified rendering behavior; device and network conditions still affect responsiveness.

## Optional configuration

| Variable | Purpose |
| --- | --- |
| `YOUTUBE_API_KEY` | Resolve demonstration videos through the YouTube Data API. Existing cached videos and the keyless resolver can work without it. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL for shared custom exercises and sign-in. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public Supabase client key. |
| `SUPABASE_SECRET_KEY` | Server-only credential for authorized custom-exercise writes. |
| `CUSTOM_EXERCISE_ADMIN_EMAIL` | Confirmed Supabase Auth email allowed to create and edit custom exercises. |
| `RAPIDAPI_KEY` | Optional one-song audio-test experiment in the current working tree; not required by EchoPlay. |

Keep server secrets in `.env.local` or deployment environment settings. Do not commit environment files or expose server secrets with a `NEXT_PUBLIC_` prefix.

### Supabase setup

#### Personal accounts and Google sign-in

Open `/account` (the **Account** link in the header) for email sign-in/registration, Google sign-in, sync status/retry and JSON backup export. Supabase Auth issues the JWT and manages session refresh; personal training reads/writes use that user's JWT under RLS.

1. Run [personal-training.sql](personal-training.sql) in the Supabase SQL editor after the existing migrations. It creates the private `personal_training` table and revision-checked save function. This repository change does not apply the script to the live database automatically.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These existing public variables are sufficient for personal sync; the server secret is only needed for admin custom-exercise publishing.
3. Enable email sign-in and configure email confirmation as desired in Supabase Authentication.
4. Enable **Google** in Supabase Authentication providers and enter a Google OAuth web client ID/secret. In Google Cloud configure the consent screen and set the authorized redirect URI to the callback shown by Supabase (`https://<project-ref>.supabase.co/auth/v1/callback`). Follow the [official Google provider setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).
5. Add each app's exact `/account` URL to Supabase Authentication URL Configuration's redirect allow list, including `http://localhost:3001/account` for the current development server, `http://localhost:3000/account` for the default port, and your deployed origin. Set the production Site URL appropriately. The Google client secret stays in Supabase, never in the browser or repository.

Sign in from the **same browser and origin** holding the existing data. The first account claims and imports that browser's workouts, exercise snapshots, favourites, notes, progress/history and schedule; existing cloud data is merged rather than replaced. Original legacy storage keys are retained. Signing out switches to a separate guest cache; another account does not receive the first account's data. Guests remain usable without an account.

Changes save to a per-account device cache and sync after a short debounce, on reconnect/focus and every 30 seconds. Failed sync retains the cache. Concurrent writes use revision checks and a three-way merge; conflicting note/schedule text retains both versions. Timer and music playback remain device-local.

Run `node training-sync.test.cjs` for migration/merge checks, or `node training-sync.test.cjs --browser` against the running app for mocked Auth/database browser checks. Set `TEST_BASE_URL` to change its default `http://localhost:3001`. Mocks do not verify live RLS policies or actual Google account authorization.

#### Shared custom exercise publishing

1. Apply the migrations in order:
   - [Create custom exercises](supabase/migrations/202611020001_custom_exercises.sql).
   - [Add primary muscles and specific targets](supabase/migrations/202611090001_custom_exercise_primary_muscles.sql).
2. Create a confirmed app user in Supabase Authentication and set `CUSTOM_EXERCISE_ADMIN_EMAIL` to that email.
3. Configure the four Supabase variables above, then restart or redeploy.
4. Optionally import existing local custom records:

```bash
npm run db:import-exercises -- --dry-run
npm run db:import-exercises
```

The first command validates records without writing. The second imports them, preserving existing slugs and local files.

In the app, **Create exercise** accepts a name, YouTube link, and specific targets. Admins can edit custom exercises while keeping their slug, notes, and saved workout references stable. Public database reads remain available; privileged writes require the authorized app user's token. Built-in dataset exercises are not editable.

## Data and persistence

| Data | Storage |
| --- | --- |
| Bundled exercise catalog | `data/exercises.json`. |
| Custom exercise metadata | Supabase when configured, merged with bundled `data/custom/` records. Development without Supabase can save local JSON; production publishing requires Supabase. |
| Workouts, schedule, favourites, progress, history and notes | Private Supabase training snapshot when signed in, plus per-account browser cache; guest data stays local. |
| Timer and music playback | Device-local runtime/storage state. |
| Resolved demonstration videos | `data/videos/`, with temporary runtime caching on read-only hosts. |
| Anatomy model and previews | Self-hosted under `public/models/anatomy/`. |

Exercise photos load from the free-exercise-db CDN. EchoPlay and embedded YouTube playback depend on their external services. Music does not require Spotify credentials; `/spotify` redirects to `/music` for compatibility.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run setup` | Download the exercise dataset. |
| `npm run dev` | Start the development server. |
| `npm run typecheck` | Check TypeScript, including unused locals and parameters. |
| `npm run build` | Build for production; the prebuild step reuses or downloads the dataset as needed. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run the configured Next.js lint command. |
| `npm run deploy:preview` | Run the Vercel CLI for a preview deployment. |
| `npm run deploy` | Run the Vercel CLI for production deployment. |

To build separately from an already running development server:

```powershell
$env:NEXT_DIST_DIR = '.next-production'
npm.cmd run build
npm.cmd run start -- --port 3001
```

Normal development uses `.next`. Both build directories are ignored by Git.

### Validation

Start the app, then run:

```bash
npm run typecheck
node scripts/test-anatomy-performance.cjs
node scripts/test-anatomy-targets.cjs
node tests/music-preservation.cjs
node tests/supabase-storage.cjs
```

The anatomy checks cover deferred model loading, one reused renderer, all muscle groups, mobile resolution, keyboard/focus behavior, unsupported WebGL, session jumps, exact-target browsing, and difficulty order. Music preservation checks protect browser-local workouts, history, notes, and timer state.

Browser checks use `playwright-core` and an installed Chrome browser. The anatomy scripts accept `CHROME_PATH`, `TEST_BASE_URL`, and `ANATOMY_ARTIFACTS`; default reports are written to `../tmp/anatomy-performance/` and `../tmp/anatomy-targets/`. Their fixtures use isolated browser storage and do not publish exercise records.

Use the current scripts above for anatomy validation. The older `tests/muscle-guide.cjs` targets the retired eager viewer. More checks are documented in [tests/README.md](tests/README.md).

## Project layout

```text
src/app/                         Routes, API handlers, layout, and styles
src/components/                  Exercise cards, movement demos, training UI, timers, and music
src/components/AnatomyProvider.tsx   Shared lazy-viewer state
src/components/AnatomyExplorer.tsx   Modal, session jumps, and target navigation
src/components/MuscleBody3D.tsx      Three.js rendering and pointer interaction
src/lib/                         Exercise search, target metadata, anatomy geometry, storage, and integrations
public/models/anatomy/           Model, compressed runtime asset, previews, and licenses
scripts/                         Dataset/import tools and current anatomy checks
supabase/migrations/             Custom-exercise schema and target metadata
data/                            Bundled exercises, custom records, and caches
tests/                           Other browser and storage checks
```

The retired hero, monthly calendar component, Spotify provider, and MakeHuman model pipeline have been removed. Active training views use `WorkoutHeatmap`, `MusicProvider`, and the shared Z-Anatomy viewer.

For detailed architecture and implementation progress, see [codebase.md](codebase.md).

## Deploying to Vercel

Import the GitHub repository with the Next.js framework preset. Use the directory containing `package.json` as the project root.

The checked-in [vercel.json](vercel.json) configures `npm ci` and `npm run vercel-build`. Use Node.js 22.x and the default Next.js output directory, not a static `out` export. Configure optional integration variables in the deployment environment before building. `next.config.mjs` includes the runtime dataset files in server tracing.

Browser-local training features do not require a database. Use Supabase for shared custom exercises and production publishing. Filesystem caches on serverless instances are temporary; they are not durable storage for user data.

## Credits and licensing

- Exercise catalog and photos: [free-exercise-db](https://github.com/yuhonas/free-exercise-db), MIT.
- Anatomical geometry: Z-Anatomy / BodyParts3D, using the [Fit Mit With mobile atlas](https://github.com/slfresh/fitmitwith-anatomy-atlas).
- Anatomy source, optimized model, rendered previews, and model adaptations: **CC BY-SA 4.0**. See [model provenance and rebuild instructions](public/models/anatomy/README.md), [attribution](public/models/anatomy/ATTRIBUTION.txt), [upstream notices](public/models/anatomy/Z-Anatomy-LICENSE.txt), and [license](public/models/anatomy/LICENSE.txt). This model license does not relicense the application code.
- The anatomical asset has not been independently reviewed by an anatomy specialist. Highlighting represents training regions, not measured muscle activation.

Built with Next.js, React, TypeScript, Tailwind CSS, Framer Motion, Three.js, Fuse.js, and Supabase.
