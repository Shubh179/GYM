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
