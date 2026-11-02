# RepVisual — AI-Powered Gym Exercise Visualization

Search any gym exercise and instantly watch an animated demonstration of the full
rep — **start position → movement → finish** — plus the muscles worked, equipment,
and technique tips. Exercises missing from the dataset are generated on demand by
Claude and **cached** so the next search is instant.

## How it works

- **873 exercises with real photos** come from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (MIT).
  Each has a start frame (`0.jpg`) and finish frame (`1.jpg`).
- **Signature viewer:** the `MovementViewer` crossfades the two frames in a loop —
  a reliable animated movement demo — with play/pause, 0.5x–2x speed, a Start↔Finish
  scrubber, and position badges.
- **AI fallback:** search something not in the dataset and Claude returns a strict
  structured breakdown (steps, tips, muscles, start/finish cues, and a two-frame
  stick-figure pose). The pose is rendered as an animated SVG motion diagram. The
  result is saved to `data/generated/<slug>.json` for instant repeat loads.
- **Zero keys needed** for core search + all 873 photo demonstrations. An
  `ANTHROPIC_API_KEY` is only required to generate exercises not already present.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion · Fuse.js
(fuzzy search) · `@anthropic-ai/sdk` (Claude, structured outputs).

## Setup

```bash
cd gym-visualizer
npm install
npm run setup      # downloads the dataset into data/exercises.json
cp .env.example .env   # optional: add ANTHROPIC_API_KEY for AI generation
npm run dev        # http://localhost:3000
```

### Credentials

| Variable            | Required?                     | Purpose                                           |
| ------------------- | ----------------------------- | ------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Only for AI generation        | Generates guides for exercises not in the dataset |

Everything else runs with no keys. Images load from the jsDelivr CDN at runtime.

## Scripts

- `npm run setup` — fetch the exercise dataset
- `npm run dev` — start the dev server
- `npm run build` — production build (type-checks + lints)
- `npm run start` — serve the production build

## Project layout

```
scripts/fetch-dataset.mjs        download dataset
data/exercises.json              bundled dataset (git-ignored, created by setup)
data/generated/<slug>.json       AI cache (instant on repeat)
src/lib/                         exercises (Fuse.js), cache, ai (Claude), types
src/app/                         home, /search, /exercise/[slug], /api/*
src/components/                  MovementViewer, PoseFigure, SearchBar, Hero, …
```


## Deploy to Vercel

Push the project to GitHub and import the repository into Vercel. Use the repository root as the Root Directory and the Next.js framework preset. The checked-in `vercel.json` sets:

- Node.js: 22.x (from `package.json` engines)
- Install Command: `npm ci`
- Build Command: `npm run vercel-build`
- Output Directory: leave at the Next.js default; do not use `out`

`vercel-build` runs the production build. Its `prebuild` step validates and reuses `data/exercises.json`, or downloads it if missing. Runtime dataset files are included through Next.js file tracing.

Add any API keys in Vercel Project Settings > Environment Variables, then redeploy: `ANTHROPIC_API_KEY` for AI exercise generation, optionally `YOUTUBE_API_KEY`, and optionally `GEMINI_API_KEY` / `GEMINI_VIDEO_MODEL` for the legacy video-generation route. Basic browsing, saved workouts, timers, Spotify embeds, and manually linked YouTube videos do not require these keys. Do not commit `.env`.

CLI alternative (run from this project directory):

```bash
npm run deploy:preview
npm run deploy
```

The first command creates a preview deployment; the second deploys to production. Vercel CLI prompts you to log in/link a project if needed. These scripts use `npx`, so a global CLI installation is unnecessary. To verify locally, use `npm run build` followed by `npm run start`.

### Storage on Vercel

A database is not required for browsing the bundled dataset or browser-local favourites, sessions, workout history, notes, timers, and saved Spotify links. These browser-local records do not sync across devices or domains.

**Creating new custom exercises after deployment requires durable storage before that feature can work reliably.** The current implementation writes JSON under `data/custom/`, which works locally but is not writable durable storage on Vercel. Existing custom JSON files can be committed with the repository and read as bundled data. A database or persistent object store is needed for new deployed additions. AI/YouTube runtime caches are temporary; the legacy Veo route also needs external storage for generated MP4 files. No database has been configured by these deployment scripts.

Official deployment settings: https://vercel.com/docs/project-configuration/vercel-json
