# RepVisual — Complete Codebase Documentation

> AI-Powered Gym Exercise Visualization · Next.js 14 · TypeScript · Tailwind CSS · Framer Motion · Claude AI · Google Veo

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Configuration Files](#configuration-files)
6. [Scripts](#scripts)
7. [Library / Utilities (`src/lib/`)](#library--utilities-srclib)
8. [API Routes (`src/app/api/`)](#api-routes-srcappapi)
9. [Pages (`src/app/`)](#pages-srcapp)
10. [Components (`src/components/`)](#components-srccomponents)

---

## Project Overview

**RepVisual** is a web application that lets users search any gym exercise and watch an animated demonstration of the full rep — start position → movement → finish — plus muscles worked, equipment, and technique tips.

### Key Features

- **873 exercises with real photos** from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (MIT license)
- **Animated movement viewer** that crossfades start/finish frames in a smooth loop
- **AI fallback** — exercises not in the dataset are generated on-demand by Claude AI with structured breakdowns and animated SVG stick-figure poses
- **Deep dive videos** — optional Veo-generated rep-tension video clips
- **YouTube integration** — embedded exercise demonstration videos
- **Personal training library** — favourites, custom workout sessions, progress tracking with a GitHub-style heatmap
- **All data cached** — AI-generated exercises and video resolutions are saved to disk for instant repeat loads

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client (Browser)                        │
│                                                                  │
│  ┌──────────┐  ┌───────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Hero   │  │ SearchBar │  │ExerciseCard │  │  Library    │ │
│  │          │  │(autocmpl) │  │  (grid)     │  │ (localStorage│ │
│  └────┬─────┘  └─────┬─────┘  └──────┬──────┘  │  context)   │ │
│       │              │               │          └─────────────┘ │
│       │              │               │                          │
│  ┌────▼──────────────▼───────────────▼──────────────────────┐   │
│  │                    ExerciseView                           │   │
│  │  ┌───────────────┐ ┌──────────┐ ┌─────────────────────┐  │   │
│  │  │MovementViewer │ │MuscleMap │ │  TechniqueSteps     │  │   │
│  │  │ (crossfade or │ │          │ │                     │  │   │
│  │  │  PoseFigure)  │ │          │ │                     │  │   │
│  │  └───────────────┘ └──────────┘ └─────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────────────┐
│                      Next.js Server (API Routes)                 │
│                                                                  │
│  /api/exercises ─── Fuse.js search over 873 exercises            │
│  /api/exercise/[slug] ─── single exercise lookup                 │
│  /api/generate ─── Claude AI structured guide generation         │
│  /api/generate-video ─── Google Veo video generation             │
│                                                                  │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐   │
│  │exercises.ts │  │  ai.ts   │  │  cache.ts  │  │  veo.ts  │   │
│  │(dataset +   │  │(Claude)  │  │(disk cache)│  │(Gemini)  │   │
│  │ Fuse.js)    │  │          │  │            │  │          │   │
│  └──────┬──────┘  └────┬─────┘  └─────┬──────┘  └────┬─────┘   │
│         │              │              │               │          │
│  ┌──────▼──────┐  ┌────▼──────┐  ┌────▼──────┐  ┌────▼──────┐  │
│  │exercises.  │  │Anthropic  │  │data/      │  │Google    │  │
│  │json (873)  │  │API        │  │generated/ │  │Gemini API│  │
│  └─────────────┘  └───────────┘  └───────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer         | Technology                                                      |
| ------------- | --------------------------------------------------------------- |
| Framework     | Next.js 14 (App Router, TypeScript)                             |
| Styling       | Tailwind CSS 3 (custom dark theme: `ink-*`, `lime-*` palettes)  |
| Animations    | Framer Motion (page transitions, hero entrance, micro-animations) |
| Search        | Fuse.js (fuzzy search over 873 exercises)                       |
| AI Text/Pose  | Anthropic Claude (`@anthropic-ai/sdk`, Zod structured outputs)  |
| AI Video      | Google Gemini / Veo (`@google/genai`)                           |
| Video Embed   | YouTube (Data API v3 or keyless search embed)                   |
| Validation    | Zod (schema validation for AI responses)                        |
| Font          | Inter (Google Fonts)                                            |
| Deployment    | Vercel (with `vercel.json`)                                     |

---

## Project Structure

```
gym-visualizer/
├── .env                        # API keys (Anthropic, YouTube, Gemini)
├── .env.example                # Template for environment variables
├── .gitignore
├── next.config.mjs             # Next.js config (CDN images, file tracing)
├── package.json                # Dependencies and scripts
├── postcss.config.mjs          # PostCSS (Tailwind)
├── tailwind.config.ts          # Custom theme (colors, shadows, animations)
├── tsconfig.json               # TypeScript configuration
├── vercel.json                 # Vercel deployment config
├── scripts/
│   └── fetch-dataset.mjs       # Downloads 873 exercises from GitHub
├── data/
│   ├── exercises.json          # Bundled dataset (created by `npm run setup`)
│   ├── generated/              # AI-cached exercise JSONs (per slug)
│   └── videos/                 # Cached YouTube video resolutions
├── public/
│   └── demos/                  # Veo-generated MP4 clips (created on demand)
└── src/
    ├── app/
    │   ├── globals.css         # Base styles, slider thumb, selection color
    │   ├── layout.tsx          # Root layout: Inter font, Navbar, LibraryProvider
    │   ├── page.tsx            # Home: Hero + muscle browse + popular exercises
    │   ├── search/
    │   │   └── page.tsx        # Search results grid
    │   ├── exercise/
    │   │   └── [slug]/
    │   │       └── page.tsx    # Exercise detail (dataset → cache → AI gen)
    │   ├── library/
    │   │   └── page.tsx        # "My Training" — custom workouts, compact daily heatmap
    │   ├── timer/
    │   │   └── page.tsx        # Direct workout timer (stopwatch controls)
    │   └── api/
    │       ├── exercises/
    │       │   └── route.ts    # GET: search, filter by muscle, popular
    │       ├── exercise/
    │       │   └── [slug]/
    │       │       └── route.ts # GET: single exercise lookup
    │       ├── generate/
    │       │   └── route.ts    # POST: Claude AI exercise generation
    │       └── generate-video/
    │           └── route.ts    # POST: Veo deep-dive video generation
    ├── components/
    │   ├── Hero.tsx            # Landing hero with search + animated gradient
    │   ├── SearchBar.tsx       # Autocomplete search with live API suggestions
    │   ├── MovementViewer.tsx  # Core viewer: crossfade animation loop
    │   ├── PoseFigure.tsx      # SVG stick-figure for AI-generated poses
    │   ├── ExerciseCard.tsx    # Grid card with favourite toggle & note badge
    │   ├── ExerciseView.tsx    # Full exercise detail layout
    │   ├── ExerciseActions.tsx # Save + add-to-workout controls + quick notes jump
    │   ├── QuickNotes.tsx      # Exercise-specific personal reminders & form cues
    │   ├── FloatingTimer.tsx   # Persistent floating rest/stopwatch timer widget
    │   ├── GenerateFlow.tsx    # AI generation flow (loading → result)
    │   ├── GeneratingState.tsx # Animated loading state during AI gen
    │   ├── MuscleMap.tsx       # Primary/secondary muscles display
    │   ├── TechniqueSteps.tsx  # Step-by-step instructions + tips
    │   ├── DeepDiveVideo.tsx   # YouTube/Veo video player (collapsible)
    │   ├── MonthlyHeatmap.tsx  # Legacy monthly calendar (not used on My Training)
    │   ├── InlineExercisePicker.tsx # Inline exercise search & add drawer for sessions
    │   ├── WorkoutHeatmap.tsx  # Compact daily contribution grid with clickable history
    │   └── Navbar.tsx          # Top navigation with logo + links + timer indicator
    └── lib/
        ├── types.ts            # All TypeScript interfaces
        ├── exercises.ts        # Dataset loader, Fuse.js, slug/search utils
        ├── ai.ts               # Claude structured generation pipeline
        ├── cache.ts            # Disk cache for AI-generated exercises
        ├── library.tsx         # React context: favourites, workouts, heatmap, notes
        ├── timer.tsx           # React context: stopwatch, rest timer, audio chime
        ├── veo.ts              # Google Veo video generation
        ├── video.ts            # Deep-dive video file lookup
        ├── youtube.ts          # YouTube resolution (API + scrape)
        └── youtube-embed.ts    # YouTube embed URL builders
```

---

## Configuration Files

### `package.json`

```json
{
  "name": "gym-visualizer",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "setup": "node scripts/fetch-dataset.mjs",
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "deploy": "vercel --prod"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "0.70.0",
    "@google/genai": "^2.28.0",
    "framer-motion": "11.18.2",
    "fuse.js": "7.1.0",
    "next": "14.2.33",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "zod": "^4.6.5"
  },
  "devDependencies": {
    "@types/node": "20.19.9",
    "@types/react": "18.3.23",
    "@types/react-dom": "18.3.7",
    "autoprefixer": "10.4.21",
    "postcss": "8.5.6",
    "tailwindcss": "3.4.17",
    "typescript": "5.9.2"
  }
}
```

### `next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
      },
    ],
  },
  // The dataset and the pre-resolved video/guide JSON are read from disk at
  // runtime (via process.cwd()). Next.js does not reliably trace process.cwd()
  // reads into the serverless bundle, so force-include data/** for the routes
  // that need it — otherwise those functions 500 on Vercel with ENOENT.
  experimental: {
    outputFileTracingIncludes: {
      "/exercise/[slug]": ["./data/**"],
      "/api/exercises": ["./data/**"],
      "/api/exercise/[slug]": ["./data/**"],
      "/api/generate": ["./data/**"],
      "/api/generate-video": ["./data/**"],
    },
  },
};

export default nextConfig;
```

### `tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07070a",
          900: "#0b0b10",
          850: "#101017",
          800: "#15151f",
          700: "#1d1d2b",
          600: "#2a2a3c",
        },
        lime: {
          DEFAULT: "#c6ff2e",
          soft: "#d6ff6b",
          deep: "#9ad400",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(198,255,46,0.45)",
        card: "0 10px 40px -12px rgba(0,0,0,0.7)",
      },
      keyframes: {
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "gradient-pan": "gradient-pan 8s ease infinite",
        "fade-up": "fade-up 0.5s ease forwards",
      },
    },
  },
  plugins: [],
};

export default config;
```

### `.env` (Environment Variables)

```bash
# Anthropic Claude API key — REQUIRED ONLY for AI generation of exercises
# that are not already in the bundled 876-exercise dataset.
# Core search + 873 visual demonstrations work with NO key at all.
ANTHROPIC_API_KEY=<your-key>

# (Optional) YouTube Data API v3 key — resolves embeddable video clips.
YOUTUBE_API_KEY=

# Google Gemini (Veo) key — enables on-demand deep-dive video generation.
GEMINI_API_KEY=<your-key>

# (Optional) Override the Veo model. Default: veo-3.0-fast-generate-001
GEMINI_VIDEO_MODEL=
```

---

## Scripts

### `scripts/fetch-dataset.mjs`

Downloads the exercise dataset from GitHub and saves it to `data/exercises.json`.

```javascript
// Downloads the free-exercise-db dataset into data/exercises.json
// Run with: npm run setup
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const OUT_FILE = path.join(DATA_DIR, "exercises.json");
const GENERATED_DIR = path.join(DATA_DIR, "generated");

const SOURCE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

async function main() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(GENERATED_DIR)) await mkdir(GENERATED_DIR, { recursive: true });

  console.log(`Fetching dataset from ${SOURCE} ...`);
  const res = await fetch(SOURCE);
  if (!res.ok) {
    throw new Error(`Failed to fetch dataset: HTTP ${res.status}`);
  }
  const json = await res.json();
  const list = Array.isArray(json) ? json : json.exercises;
  if (!Array.isArray(list)) {
    throw new Error("Unexpected dataset shape — expected an array of exercises.");
  }

  await writeFile(OUT_FILE, JSON.stringify(list), "utf8");
  const withImages = list.filter((e) => e.images && e.images.length > 0).length;
  console.log(`Saved ${list.length} exercises (${withImages} with images) to data/exercises.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

---

## Library / Utilities (`src/lib/`)

### `types.ts` — Type Definitions

All shared TypeScript interfaces used across the app.

```typescript
// Shared types for the gym visualizer.

// Raw record shape from free-exercise-db.
export interface RawExercise {
  id: string;
  name: string;
  force?: string | null;
  level?: string;
  mechanic?: string | null;
  equipment?: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[]; // e.g. "Bench_Press/0.jpg", "Bench_Press/1.jpg"
}

// Normalized exercise used across the app.
export interface Exercise {
  id: string;
  slug: string;
  name: string;
  level: string;
  equipment: string | null;
  mechanic: string | null;
  force: string | null;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  // Full CDN image URLs. [0] = start position, [1] = finish position.
  imageUrls: string[];
  source: "dataset";
}

// AI-generated guide for exercises not in the dataset.
export interface GeneratedExercise {
  id: string;
  slug: string;
  name: string;
  level: string;
  equipment: string | null;
  mechanic: string | null;
  force: string | null;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  imageUrls: string[]; // empty for AI; viewer falls back to SVG pose
  tips: string[];
  startPositionCue: string;
  finishPositionCue: string;
  svgPose?: SvgPose | null;
  source: "ai";
  generatedAt: string;
}

// A minimal two-frame stick-figure pose for the animated SVG diagram.
// Coordinates are in a 0-100 viewbox space.
export interface PoseFrame {
  // Named joints; each is [x, y] in 0..100.
  head: [number, number];
  neck: [number, number];
  hip: [number, number];
  leftHand: [number, number];
  rightHand: [number, number];
  leftElbow: [number, number];
  rightElbow: [number, number];
  leftFoot: [number, number];
  rightFoot: [number, number];
  leftKnee: [number, number];
  rightKnee: [number, number];
}

export interface SvgPose {
  start: PoseFrame;
  finish: PoseFrame;
}

export type AnyExercise = Exercise | GeneratedExercise;

export interface SearchResult {
  slug: string;
  name: string;
  level: string;
  equipment: string | null;
  category: string;
  primaryMuscles: string[];
  thumbUrl: string | null;
}
```

### `exercises.ts` — Dataset Loader & Fuse.js Search

Loads 873 exercises, normalizes them, and provides fuzzy search via Fuse.js.

```typescript
import Fuse from "fuse.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Exercise, RawExercise, SearchResult } from "./types";

const CDN_BASE =
  "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function imageUrl(imagePath: string): string {
  return `${CDN_BASE}/${encodeURI(imagePath)}`;
}

function normalize(raw: RawExercise): Exercise {
  return {
    id: raw.id,
    slug: slugify(raw.name),
    name: raw.name,
    level: raw.level ?? "beginner",
    equipment: raw.equipment ?? null,
    mechanic: raw.mechanic ?? null,
    force: raw.force ?? null,
    category: raw.category,
    primaryMuscles: raw.primaryMuscles ?? [],
    secondaryMuscles: raw.secondaryMuscles ?? [],
    instructions: raw.instructions ?? [],
    imageUrls: (raw.images ?? []).map(imageUrl),
    source: "dataset",
  };
}

// Module-level caches (persist across requests within a server instance).
let exercisesCache: Exercise[] | null = null;
let bySlugCache: Map<string, Exercise> | null = null;
let fuseCache: Fuse<Exercise> | null = null;

async function loadRaw(): Promise<Exercise[]> {
  const file = path.join(process.cwd(), "data", "exercises.json");
  const text = await readFile(file, "utf8");
  const json = JSON.parse(text) as RawExercise[] | { exercises: RawExercise[] };
  const list = Array.isArray(json) ? json : json.exercises;
  return list.map(normalize);
}

export async function getAllExercises(): Promise<Exercise[]> {
  if (exercisesCache) return exercisesCache;
  exercisesCache = await loadRaw();
  return exercisesCache;
}

export async function getBySlug(slug: string): Promise<Exercise | null> {
  if (!bySlugCache) {
    const all = await getAllExercises();
    bySlugCache = new Map(all.map((e) => [e.slug, e]));
  }
  return bySlugCache.get(slug) ?? null;
}

async function getFuse(): Promise<Fuse<Exercise>> {
  if (fuseCache) return fuseCache;
  const all = await getAllExercises();
  fuseCache = new Fuse(all, {
    keys: [
      { name: "name", weight: 0.6 },
      { name: "primaryMuscles", weight: 0.2 },
      { name: "equipment", weight: 0.1 },
      { name: "category", weight: 0.1 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
  return fuseCache;
}

function toSearchResult(e: Exercise): SearchResult {
  return {
    slug: e.slug,
    name: e.name,
    level: e.level,
    equipment: e.equipment,
    category: e.category,
    primaryMuscles: e.primaryMuscles,
    thumbUrl: e.imageUrls[0] ?? null,
  };
}

export async function searchExercises(
  query: string,
  limit = 48
): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) {
    const all = await getAllExercises();
    return all.slice(0, limit).map(toSearchResult);
  }
  const fuse = await getFuse();
  return fuse
    .search(q, { limit })
    .map((r) => toSearchResult(r.item));
}

export async function listMuscles(): Promise<string[]> {
  const all = await getAllExercises();
  const set = new Set<string>();
  for (const e of all) e.primaryMuscles.forEach((m) => set.add(m));
  return Array.from(set).sort();
}

export async function byMuscle(muscle: string, limit = 48): Promise<SearchResult[]> {
  const all = await getAllExercises();
  return all
    .filter((e) => e.primaryMuscles.includes(muscle))
    .slice(0, limit)
    .map(toSearchResult);
}

export async function popularExercises(limit = 8): Promise<SearchResult[]> {
  // Curated well-known names; fall back to first entries if any are missing.
  const picks = [
    "Barbell Squat",
    "Barbell Bench Press - Medium Grip",
    "Barbell Deadlift",
    "Pullups",
    "Dumbbell Bicep Curl",
    "Incline Dumbbell Press",
    "Standing Military Press",
    "Dumbbell Lunges",
  ];
  const all = await getAllExercises();
  const bySlug = new Map(all.map((e) => [e.slug, e]));
  const out: Exercise[] = [];
  for (const name of picks) {
    const hit = bySlug.get(slugify(name));
    if (hit) out.push(hit);
  }
  for (const e of all) {
    if (out.length >= limit) break;
    if (!out.includes(e) && e.imageUrls.length >= 2) out.push(e);
  }
  return out.slice(0, limit).map(toSearchResult);
}
```

### `ai.ts` — Claude AI Structured Generation

Generates exercise guides using Claude's structured output with Zod validation.

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { slugify } from "./exercises";
import type { GeneratedExercise, PoseFrame, SvgPose } from "./types";

export class MissingKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set");
    this.name = "MissingKeyError";
  }
}

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const coord = z.array(z.number()).length(2);

const PoseFrameSchema = z.object({
  head: coord,
  neck: coord,
  hip: coord,
  leftHand: coord,
  rightHand: coord,
  leftElbow: coord,
  rightElbow: coord,
  leftFoot: coord,
  rightFoot: coord,
  leftKnee: coord,
  rightKnee: coord,
});

const GuideSchema = z.object({
  name: z.string(),
  level: z.enum(["beginner", "intermediate", "expert"]),
  category: z.string(),
  equipment: z.string(),
  mechanic: z.enum(["compound", "isolation"]),
  force: z.enum(["push", "pull", "static"]),
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
  instructions: z.array(z.string()),
  tips: z.array(z.string()),
  startPositionCue: z.string(),
  finishPositionCue: z.string(),
  pose: z.object({
    start: PoseFrameSchema,
    finish: PoseFrameSchema,
  }),
});

type Guide = z.infer<typeof GuideSchema>;
type RawFrame = Guide["pose"]["start"];

function toFrame(f: RawFrame): PoseFrame {
  const p = (c: number[]): [number, number] => [c[0], c[1]];
  return {
    head: p(f.head),
    neck: p(f.neck),
    hip: p(f.hip),
    leftHand: p(f.leftHand),
    rightHand: p(f.rightHand),
    leftElbow: p(f.leftElbow),
    rightElbow: p(f.rightElbow),
    leftFoot: p(f.leftFoot),
    rightFoot: p(f.rightFoot),
    leftKnee: p(f.leftKnee),
    rightKnee: p(f.rightKnee),
  };
}

const SYSTEM = `You are a certified strength and conditioning coach and biomechanics expert.
You produce precise, safe, structured breakdowns of gym exercises.
For the animated pose diagram, output a simple 2D stick-figure for a side-on view.
Use a 0-100 coordinate space where x grows to the right and y grows downward
(0 = top of frame, 100 = bottom/floor). Keep joints anatomically plausible and
make the START and FINISH frames clearly different so the movement reads well
when the two frames alternate. Feet should sit near y=95 for standing moves.`;

function toGenerated(guide: Guide): GeneratedExercise {
  const slug = slugify(guide.name);
  const svgPose: SvgPose = {
    start: toFrame(guide.pose.start),
    finish: toFrame(guide.pose.finish),
  };
  return {
    id: `ai-${slug}`,
    slug,
    name: guide.name,
    level: guide.level,
    equipment: guide.equipment,
    mechanic: guide.mechanic,
    force: guide.force,
    category: guide.category,
    primaryMuscles: guide.primaryMuscles,
    secondaryMuscles: guide.secondaryMuscles,
    instructions: guide.instructions,
    imageUrls: [],
    tips: guide.tips,
    startPositionCue: guide.startPositionCue,
    finishPositionCue: guide.finishPositionCue,
    svgPose,
    source: "ai",
    generatedAt: new Date().toISOString(),
  };
}

export async function generateGuide(name: string): Promise<GeneratedExercise> {
  if (!hasApiKey()) throw new MissingKeyError();

  const client = new Anthropic();

  const response = await client.beta.messages.parse({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    betas: ["structured-outputs-2025-11-13"],
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Create a complete gym exercise guide for: "${name}".
Return structured data including: difficulty level, category, equipment, mechanic,
force type, primary and secondary muscles, numbered step-by-step instructions,
3-6 concise technique tips, a one-sentence START position cue, a one-sentence FINISH
position cue, and a two-frame side-on stick-figure pose (start and finish) in the
0-100 coordinate space described in the system prompt.`,
      },
    ],
    output_format: betaZodOutputFormat(GuideSchema),
  });

  const guide = response.parsed_output;
  if (!guide) {
    throw new Error("AI did not return a valid guide.");
  }
  return toGenerated(guide);
}
```

### `cache.ts` — Disk Cache for AI-Generated Exercises

```typescript
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { GeneratedExercise } from "./types";

// AI-generated exercises are cached to disk so a repeat view is instant.
//
// On a normal machine (local dev) the bundled `data/generated` dir is writable
// and entries persist in the repo. On a serverless host (Vercel) the deployment
// filesystem is read-only, so runtime writes go to the OS temp dir instead —
// which persists for the life of a warm Lambda. Reads check both locations.

const BUNDLED_DIR = path.join(process.cwd(), "data", "generated");
const TMP_DIR = path.join(os.tmpdir(), "repvisual-generated");

function fileIn(dir: string, slug: string): string {
  return path.join(dir, `${slug}.json`);
}

export async function readCached(slug: string): Promise<GeneratedExercise | null> {
  for (const dir of [BUNDLED_DIR, TMP_DIR]) {
    const file = fileIn(dir, slug);
    if (!existsSync(file)) continue;
    try {
      return JSON.parse(await readFile(file, "utf8")) as GeneratedExercise;
    } catch {
      // Corrupt file — try the next location.
    }
  }
  return null;
}

export async function writeCached(exercise: GeneratedExercise): Promise<void> {
  // Try the bundled dir first (persists in the repo during local dev); if that
  // fails because the filesystem is read-only (serverless), fall back to /tmp.
  for (const dir of [BUNDLED_DIR, TMP_DIR]) {
    try {
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
      await writeFile(
        fileIn(dir, exercise.slug),
        JSON.stringify(exercise, null, 2),
        "utf8",
      );
      return;
    } catch {
      // Read-only or otherwise unwritable — try the next location.
    }
  }
  // Both failed: caching is best-effort, so just skip it silently.
}
```

### `library.tsx` — Client-Side Personal Training Store

React context providing favourites, custom workouts, progress tracking, and heatmap data — all persisted to `localStorage`.

```typescript
"use client";

// Client-side "personal training" store: favourites + custom workout sessions.
// Persisted to localStorage so the user's library survives reloads with no
// backend or account. All components under <LibraryProvider> can use useLibrary().

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SearchResult } from "./types";

// A saved exercise carries just enough to render a card without re-fetching.
export type SavedExercise = SearchResult;

export interface Workout {
  id: string;
  name: string;
  exercises: SavedExercise[];
}

// A snapshot of a completed workout session, stored in workoutHistory.
export interface CompletedSession {
  id: string;
  workoutId: string;
  workoutName: string;
  exercises: SavedExercise[];
  completedAt: string; // ISO timestamp
  notes?: string;
}

interface LibraryState {
  favourites: SavedExercise[];
  workouts: Workout[];
  // Per-workout in-progress ticks: workout id -> checked exercise slugs.
  progress: Record<string, string[]>;
  // Heatmap data: date "YYYY-MM-DD" -> number of sessions completed that day.
  completions: Record<string, number>;
  // Which workout sessions were marked complete on a given day:
  // date "YYYY-MM-DD" -> list of workout ids.
  sessionLog: Record<string, string[]>;
  // Full workout history: date "YYYY-MM-DD" -> completed sessions with exercises.
  workoutHistory: Record<string, CompletedSession[]>;
}

interface LibraryContextValue extends LibraryState {
  hydrated: boolean;
  // Favourites
  isFavourite: (slug: string) => boolean;
  toggleFavourite: (ex: SavedExercise) => void;
  // Workouts
  createWorkout: (name: string) => Workout | null;
  renameWorkout: (id: string, name: string) => void;
  deleteWorkout: (id: string) => void;
  addToWorkout: (id: string, ex: SavedExercise) => void;
  removeFromWorkout: (id: string, slug: string) => void;
  isInWorkout: (id: string, slug: string) => boolean;
  // Completion tracking (drives the heatmap)
  isExerciseDone: (workoutId: string, slug: string) => boolean;
  toggleExerciseDone: (workoutId: string, slug: string) => void;
  doneCount: (workoutId: string) => number;
  // Whole-session completion (toggle the session done/undone for today).
  isSessionCompletedToday: (workoutId: string) => boolean;
  toggleSessionComplete: (workoutId: string) => void;
  // Workout history
  getHistoryForDate: (dateKey: string) => CompletedSession[];
}

const STORAGE_KEY = "repvisual:library:v1";
const EMPTY: LibraryState = {
  favourites: [],
  workouts: [],
  progress: {},
  completions: {},
  sessionLog: {},
  workoutHistory: {},
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within <LibraryProvider>");
  return ctx;
}
```

### `timer.tsx` — Stopwatch & Rest Countdown Timer Context

High-accuracy, timestamp-based timekeeping system with Web Audio API chime synthesis and persistence across tabs and page reloads.

- **Timestamp-Based Calculations**: Avoids interval drift from background tab throttling or phone lock. Calculates elapsed time using `Date.now() - startTime` and countdowns using `targetDeadline - Date.now()`.
- **Zero-Asset Web Audio Chime**: Synthesizes a pleasant dual-tone chime (A5 880Hz → D6 1174Hz) using the native browser `AudioContext` with zero network assets.
- **Hardware Integration**: Triggers `navigator.vibrate([200, 100, 200, 100, 400])` and optional Web Notifications when rest finishes.
- **Independent Controls**: Stopwatch and Rest Timer operate completely independently.
- **State Persistence**: Serialized to `localStorage` under `repvisual:timer:v1` so active timers survive page reloads and navigation.

```typescript
export interface StopwatchState {
  isRunning: boolean;
  startTime: number | null;
  elapsedBeforePause: number;
}

export interface RestTimerState {
  isRunning: boolean;
  targetDeadline: number | null;
  totalDurationMs: number;
  remainingBeforePause: number;
  isFinished: boolean;
}

export function useTimer(): TimerContextValue;
```

### `veo.ts` — Google Veo Video Generation

```typescript
import { GoogleGenAI } from "@google/genai";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// On-demand "Dive Deep · Rep Tension" video generation via Google's Veo model
// (Gemini API). This is the ONLY path that can produce real video — Claude
// generates the text guide + SVG pose, but cannot generate video.
//
// Generated clips are cached to public/demos/<slug>.mp4 so the next visitor
// gets it instantly (same caching philosophy as the AI text guides).

const DEFAULT_MODEL = "veo-3.1-fast-generate-preview";

export class MissingVideoKeyError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not set");
    this.name = "MissingVideoKeyError";
  }
}

export function hasVideoKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function videoModel(): string {
  return process.env.GEMINI_VIDEO_MODEL || DEFAULT_MODEL;
}

// Build a prompt that asks Veo for a clear slow-motion rep-tension breakdown.
function buildPrompt(name: string, primaryMuscles: string[]): string {
  const muscles =
    primaryMuscles.length > 0
      ? primaryMuscles.join(", ")
      : "the primary working muscles";
  return [
    `Educational slow-motion fitness demonstration of a single clean repetition of the "${name}" exercise.`,
    `Show one person with correct form performing the full range of motion from the start position to the finish position and back.`,
    `Emphasize where muscular tension builds: highlight the ${muscles} contracting during the lifting (concentric) phase and lengthening under load during the lowering (eccentric) phase.`,
    `Clean, well-lit gym studio, side profile camera angle so the joint angles and movement path are clearly visible.`,
    `Smooth, controlled tempo. No text overlays, no captions, no logos.`,
  ].join(" ");
}

export interface GenerateVideoInput {
  slug: string;
  name: string;
  primaryMuscles: string[];
}

// Generates a deep-dive video, saves it to public/demos/<slug>.mp4 and returns
// the public URL. Throws MissingVideoKeyError if no key is configured.
export async function generateDeepDiveVideo({
  slug,
  name,
  primaryMuscles,
}: GenerateVideoInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new MissingVideoKeyError();

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(name, primaryMuscles);

  let operation = await ai.models.generateVideos({
    model: videoModel(),
    prompt,
    config: {
      numberOfVideos: 1,
      aspectRatio: "16:9",
      negativePrompt: "text, captions, subtitles, watermark, logo, blurry, distorted anatomy",
    },
  });

  // Veo is a long-running operation — poll until it completes.
  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (operation.error) {
    const message =
      (operation.error as { message?: string })?.message ??
      "Video generation failed.";
    throw new Error(message);
  }

  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!video) {
    throw new Error("Veo returned no video (it may have been filtered).");
  }

  const demosDir = path.join(process.cwd(), "public", "demos");
  if (!existsSync(demosDir)) {
    await mkdir(demosDir, { recursive: true });
  }
  const outPath = path.join(demosDir, `${slug}.mp4`);

  // The SDK appends the API key and streams the file to disk.
  await ai.files.download({ file: video, downloadPath: outPath });

  return `/demos/${slug}.mp4`;
}
```

### `video.ts` — Deep-Dive Video Lookup

```typescript
import { existsSync } from "node:fs";
import path from "node:path";

// Deep-dive "rep tension" videos live in public/demos/<slug>.mp4.
// Core demonstrations use the two-frame animation; the deep-dive video is an
// optional richer clip (e.g. AI-generated by a video model) for users who want
// to study how tension travels through each rep.

export function deepDiveVideoFor(slug: string): string | null {
  const file = path.join(process.cwd(), "public", "demos", `${slug}.mp4`);
  if (existsSync(file)) {
    return `/demos/${slug}.mp4`;
  }
  return null;
}

// Whether a video-generation provider is configured.
export function hasVideoProvider(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
```

### `youtube.ts` — YouTube Video Resolution

```typescript
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { searchQuery, watchEmbedUrl } from "./youtube-embed";

// Server-side YouTube resolution. Resolves ONE concrete, embeddable video id per
// exercise (embedding by id is reliable; the keyless `listType=search` embed is
// deprecated and shows "Video unavailable"). Results cache to
// data/videos/<slug>.json so each exercise is only resolved once.
//
// Two resolvers, in order of preference:
//   1. YouTube Data API v3 (if YOUTUBE_API_KEY is set) — sanctioned, free quota.
//   2. Scrape the public search results page (no key) — grabs the first videoId.

const VIDEOS_DIR = path.join(process.cwd(), "data", "videos");
const TMP_VIDEOS_DIR = path.join(os.tmpdir(), "repvisual-videos");

export function hasYouTubeKey(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

interface CachedVideo {
  slug: string;
  videoId: string;
  title?: string;
  via: "api" | "scrape";
  resolvedAt: string;
}

// Resolver 1: YouTube Data API v3 (requires key).
async function resolveViaApi(
  name: string,
  context?: string,
): Promise<{ videoId: string; title?: string } | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", searchQuery(name, context));
    url.searchParams.set("type", "video");
    url.searchParams.set("videoEmbeddable", "true");
    url.searchParams.set("maxResults", "1");
    url.searchParams.set("safeSearch", "strict");
    url.searchParams.set("key", key);

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      items?: { id?: { videoId?: string }; snippet?: { title?: string } }[];
    };
    const item = data.items?.[0];
    const videoId = item?.id?.videoId;
    if (!videoId) return null;
    return { videoId, title: item?.snippet?.title };
  } catch {
    return null;
  }
}

// Resolver 2: scrape the public search results page for the first videoId.
async function resolveViaScrape(
  name: string,
  context?: string,
): Promise<{ videoId: string } | null> {
  try {
    const q = encodeURIComponent(searchQuery(name, context));
    const res = await fetch(`https://www.youtube.com/results?search_query=${q}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ...",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    const videoId = match?.[1];
    if (!videoId) return null;
    return { videoId };
  } catch {
    return null;
  }
}

export interface ResolveVideoInput {
  slug: string;
  name: string;
  context?: string;
}

// Returns an embeddable youtube-nocookie URL, or null if nothing could be resolved.
export async function resolveExerciseVideo({
  slug,
  name,
  context,
}: ResolveVideoInput): Promise<string | null> {
  const cached = await readCachedVideo(slug);
  if (cached) return watchEmbedUrl(cached.videoId);

  const api = await resolveViaApi(name, context);
  if (api) {
    await writeCachedVideo({
      slug, videoId: api.videoId, title: api.title, via: "api",
      resolvedAt: new Date().toISOString(),
    });
    return watchEmbedUrl(api.videoId);
  }

  const scraped = await resolveViaScrape(name, context);
  if (scraped) {
    await writeCachedVideo({
      slug, videoId: scraped.videoId, via: "scrape",
      resolvedAt: new Date().toISOString(),
    });
    return watchEmbedUrl(scraped.videoId);
  }

  return null;
}
```

### `youtube-embed.ts` — YouTube Embed Helpers

```typescript
// Pure YouTube embed helpers — NO node/server imports, safe for client + server.

// Build a focused query that surfaces a clear "how to" demonstration clip.
export function searchQuery(name: string, context?: string): string {
  const extra = context?.trim() ? ` ${context.trim()}` : "";
  return `${name}${extra} exercise how to proper form`;
}

// Keyless inline embed: YouTube's `listType=search` plays the top match.
export function searchEmbedUrl(name: string, context?: string): string {
  const q = encodeURIComponent(searchQuery(name, context));
  return `https://www.youtube-nocookie.com/embed?listType=search&list=${q}&rel=0&playsinline=1`;
}

// Embed a specific resolved video id (preferred when we have one).
export function watchEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`;
}
```

---

## API Routes (`src/app/api/`)

### `GET /api/exercises` — Search & Filter

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  searchExercises,
  byMuscle,
  listMuscles,
  popularExercises,
} from "@/lib/exercises";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const muscle = searchParams.get("muscle");
  const mode = searchParams.get("mode");

  if (mode === "muscles") {
    return NextResponse.json({ muscles: await listMuscles() });
  }
  if (mode === "popular") {
    return NextResponse.json({ results: await popularExercises() });
  }
  if (muscle) {
    return NextResponse.json({ results: await byMuscle(muscle) });
  }
  return NextResponse.json({ results: await searchExercises(q) });
}
```

### `GET /api/exercise/[slug]` — Single Exercise Lookup

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getBySlug, searchExercises } from "@/lib/exercises";
import { readCached } from "@/lib/cache";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  const dataset = await getBySlug(slug);
  if (dataset) {
    return NextResponse.json({ status: "found", exercise: dataset });
  }

  const cached = await readCached(slug);
  if (cached) {
    return NextResponse.json({ status: "found", exercise: cached });
  }

  // Not in dataset or cache — the client should trigger /api/generate.
  const readable = slug.replace(/-/g, " ");
  const suggestions = await searchExercises(readable, 6);
  return NextResponse.json({ status: "missing", suggestions });
}
```

### `POST /api/generate` — AI Exercise Generation

```typescript
import { NextRequest, NextResponse } from "next/server";
import { generateGuide, hasApiKey, MissingKeyError } from "@/lib/ai";
import { readCached, writeCached } from "@/lib/cache";
import { getBySlug, searchExercises, slugify } from "@/lib/exercises";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let name = "";
  try {
    const body = await req.json();
    name = (body?.name ?? "").toString().trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ error: "Missing exercise name." }, { status: 400 });
  }

  const slug = slugify(name);

  // Already in dataset? Return it (no AI needed).
  const dataset = await getBySlug(slug);
  if (dataset) {
    return NextResponse.json({ status: "found", exercise: dataset });
  }

  // Already cached from a previous generation? Instant.
  const cached = await readCached(slug);
  if (cached) {
    return NextResponse.json({ status: "cached", exercise: cached });
  }

  // No key — graceful fallback with nearest matches.
  if (!hasApiKey()) {
    const suggestions = await searchExercises(name, 6);
    return NextResponse.json({ status: "no-key", suggestions });
  }

  try {
    const exercise = await generateGuide(name);
    await writeCached(exercise);
    return NextResponse.json({ status: "generated", exercise });
  } catch (err) {
    if (err instanceof MissingKeyError) {
      const suggestions = await searchExercises(name, 6);
      return NextResponse.json({ status: "no-key", suggestions });
    }
    const message = err instanceof Error ? err.message : "Generation failed.";
    const suggestions = await searchExercises(name, 6);
    return NextResponse.json(
      { status: "error", error: message, suggestions },
      { status: 502 }
    );
  }
}
```

### `POST /api/generate-video` — Veo Video Generation

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getBySlug } from "@/lib/exercises";
import { readCached } from "@/lib/cache";
import { deepDiveVideoFor } from "@/lib/video";
import { generateDeepDiveVideo, MissingVideoKeyError } from "@/lib/veo";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let slug = "";
  try {
    const body = await req.json();
    slug = (body?.slug ?? "").toString().trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!slug) {
    return NextResponse.json({ error: "Missing exercise slug." }, { status: 400 });
  }

  // Already generated? Return instantly.
  const existing = deepDiveVideoFor(slug);
  if (existing) {
    return NextResponse.json({ status: "cached", videoUrl: existing });
  }

  // Resolve the exercise to build a muscle-aware prompt.
  const exercise = (await getBySlug(slug)) ?? (await readCached(slug));
  if (!exercise) {
    return NextResponse.json({ error: "Unknown exercise." }, { status: 404 });
  }

  try {
    const videoUrl = await generateDeepDiveVideo({
      slug,
      name: exercise.name,
      primaryMuscles: exercise.primaryMuscles,
    });
    return NextResponse.json({ status: "generated", videoUrl });
  } catch (err) {
    if (err instanceof MissingVideoKeyError) {
      return NextResponse.json({ status: "no-key" }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Video generation failed.";
    return NextResponse.json({ status: "error", error: message }, { status: 502 });
  }
}
```

---

## Pages (`src/app/`)

### `globals.css` — Base Styles

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-sans: "Inter", system-ui, sans-serif;
  --font-display: "Inter", system-ui, sans-serif;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: #07070a;
  color: #fff;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Range slider thumb */
input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  height: 18px;
  width: 18px;
  border-radius: 9999px;
  background: #c6ff2e;
  cursor: pointer;
  box-shadow: 0 0 0 4px rgba(198, 255, 46, 0.2);
}
input[type="range"]::-moz-range-thumb {
  height: 18px;
  width: 18px;
  border: none;
  border-radius: 9999px;
  background: #c6ff2e;
  cursor: pointer;
}

::selection {
  background: rgba(198, 255, 46, 0.3);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

### `layout.tsx` — Root Layout

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { LibraryProvider } from "@/lib/library";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RepVisual — See how to perform any gym exercise",
  description:
    "Search any gym exercise and watch an animated demonstration of the full rep: start position, movement, and finish — plus muscles worked and technique tips.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <LibraryProvider>
          <Navbar />
          <main>{children}</main>
          <footer className="mt-20 border-t border-white/10 px-5 py-8 text-center text-xs text-white/30">
            Exercise data from free-exercise-db (MIT). Images via jsDelivr CDN.
            AI breakdowns by Claude.
          </footer>
        </LibraryProvider>
      </body>
    </html>
  );
}
```

### `page.tsx` - Default Landing Route

The root URL (`/`) redirects to `/library` using Next.js `redirect()`, making My Training the default page. The navbar logo also links directly to `/library`. Browse remains available at `/search`.


### `search/page.tsx` — Search Results

Client-side page that fetches results from `/api/exercises` based on query params (`q` or `muscle`). Renders a grid of `ExerciseCard` components with loading skeletons and a "Generate it with AI" fallback for no results.

### `exercise/[slug]/page.tsx` — Exercise Detail

```tsx
import { getBySlug } from "@/lib/exercises";
import { readCached } from "@/lib/cache";
import { resolveExerciseVideo } from "@/lib/youtube";
import { searchEmbedUrl } from "@/lib/youtube-embed";
import ExerciseView from "@/components/ExerciseView";
import GenerateFlow from "@/components/GenerateFlow";

export default async function ExercisePage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  // 1. Dataset hit — render instantly on the server.
  const dataset = await getBySlug(slug);
  if (dataset) {
    const context = dataset.primaryMuscles[0] ?? dataset.category;
    const embedUrl =
      (await resolveExerciseVideo({ slug, name: dataset.name, context })) ??
      searchEmbedUrl(dataset.name, context);
    return <ExerciseView exercise={dataset} embedUrl={embedUrl} />;
  }

  // 2. Previously generated and cached — render instantly on the server.
  const cached = await readCached(slug);
  if (cached) {
    const context = cached.primaryMuscles[0] ?? cached.category;
    const embedUrl =
      (await resolveExerciseVideo({ slug, name: cached.name, context })) ??
      searchEmbedUrl(cached.name, context);
    return <ExerciseView exercise={cached} embedUrl={embedUrl} />;
  }

  // 3. Not found anywhere — hand off to the client AI generation flow.
  const readableName = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return <GenerateFlow slug={slug} readableName={readableName} />;
}
```

### `library/page.tsx` — My Training

Client-side page featuring:
- **WorkoutHeatmap**: compact LeetCode-style 53-week daily contribution grid with clickable workout history
- **Workout sessions**: create custom sessions using "New session", rename, delete, add/remove exercises, tick exercises done, and complete whole sessions.
- **Session controls**: workout session cards provide exercise management and completion controls. Timer and Rest 90s shortcuts have been removed from these cards; the dedicated timer page remains accessible from navigation.
- **Page layout**: compact daily activity heatmap and custom workout sessions with inline exercise search. The preset quick-start section ("Start Today's Workout") has been removed. Existing saved workouts are retained.
- **Favourites**: saved exercise cards are now on the dedicated `/favourites` page, accessed from the navbar.
- All state persisted to `localStorage` via the `LibraryProvider`

---

## Components (`src/components/`)

### `Navbar.tsx`

Sticky top navigation with glassmorphism, the RepVisual logo, Browse, Favourites (`/favourites`), Timer, and My Training. Favourites replaces By Muscle and stays available on mobile; navigation wraps below the logo on narrow screens.

### `Hero.tsx`

Landing section with:
- Animated radial gradient backdrop + gradient pan animation
- Framer Motion staggered entrance animations
- Feature badge ("873 exercises · animated demonstrations · AI fallback")
- Large heading with lime accent
- Integrated `SearchBar` component
- Quick-try exercise links

### `SearchBar.tsx`

Autocomplete search input with:
- Debounced API calls (140ms) to `/api/exercises?q=...`
- Live dropdown suggestions (up to 8) with thumbnail images
- Keyboard navigation (↑/↓/Enter/Escape)
- Click-outside-to-close behavior
- Two sizes: `lg` (hero) and `md` (search page)

### `MovementViewer.tsx`

**The core visualization component.** Features:
- `requestAnimationFrame` loop with **cosine ease** oscillation (`t` between 0 and 1)
- Crossfades two CDN images (start frame opacity 1, finish frame opacity = `t`)
- Falls back to `PoseFigure` SVG for AI-generated exercises without photos
- Play/Pause button, range slider scrubber, speed selector (0.5x, 1x, 1.5x, 2x)
- Phase labels ("Start", "Mid-rep", "Finish") and position badges

### `PoseFigure.tsx`

SVG stick-figure renderer for AI-generated exercise poses:
- Uses a 0–100 viewbox coordinate space
- Linear interpolation (`lerp`) between start and finish `PoseFrame` based on `t`
- Draws 10 bones (head→neck, neck→hip, arms, legs) as lime-colored lines
- Circle joints with ink-colored fill
- Floor line at y=97

### `ExerciseCard.tsx`

Grid card for search results with:
- Framer Motion entrance animation (staggered by index)
- Thumbnail image or "AI" placeholder
- Gradient overlay on image
- Level badge (beginner/intermediate/expert)
- Favourite heart toggle button
- Name, muscles, equipment info
- Hover effects: scale-up, border glow

### `ExerciseView.tsx`

Full exercise detail layout (two-column on desktop):
- Left column: `MovementViewer`, position cues (AI), metadata chips, `DeepDiveVideo`
- Right column: `MuscleMap`, `TechniqueSteps`
- AI badge for generated exercises
- `ExerciseActions` (save, add to workout)

### `ExerciseActions.tsx`

Action buttons on exercise detail page:
- **Save to favourites** toggle with heart icon
- **Add to workout** dropdown menu
  - Lists existing workouts with add/added state
  - Inline "create new workout" input
  - Click-outside-to-close behavior

### `GenerateFlow.tsx`

Client-side AI generation orchestrator:
- Automatically POSTs to `/api/generate` on mount
- Shows `GeneratingState` while loading
- On success: renders `ExerciseView` with the generated exercise
- On failure/no-key: shows error message + closest dataset matches

### `GeneratingState.tsx`

Animated loading screen during AI generation:
- Pulsing ring + spinning border (Framer Motion)
- "AI" badge in center
- "Generating visualization…" heading
- Three bouncing dots

### `MuscleMap.tsx`

Displays primary and secondary muscles:
- Primary muscles as lime-bordered pills with entrance animation
- Secondary muscles as white-bordered pills
- Human-readable muscle labels (e.g., "quadriceps" → "Quads")

### `TechniqueSteps.tsx`

Step-by-step exercise instructions:
- Numbered steps with lime accent circles
- Framer Motion staggered entrance
- Optional "Technique Tips" section with checkmark icons (for AI-generated exercises)

### `DeepDiveVideo.tsx`

Collapsible YouTube video player:
- "Dive Deep · Watch the Movement" section
- Toggle button to show/hide the embedded video
- Uses `AnimatePresence` for smooth expand/collapse
- Privacy-friendly `youtube-nocookie.com` embeds

### `MonthlyHeatmap.tsx`

Legacy monthly calendar component, no longer used on My Training (replaced by `WorkoutHeatmap`):
- Interactive monthly grid (Mon–Sun alignment) with Prev / Next month navigation and "Today" shortcut
- Highlights active workout days in vivid lime green with completion counts
- Clickable day cells with animated inspection drawer (`AnimatePresence`) displaying the exact completed sessions, exercise list with thumbnails, and completion timestamps
- Monthly stats badge (e.g. `X workout days in [Month]`) and status legend (Rest / Trained / Today)

### `InlineExercisePicker.tsx`

Direct inline exercise search and selection drawer embedded in workout session blocks:
- Enables users to browse and add exercises directly inside any workout session without leaving the page
- Search input with auto-focus, debounce, and query clearing
- Quick-filter muscle chips: `Suggested`, `Chest`, `Back`, `Shoulders`, `Biceps`, `Triceps`, `Legs`, `Abs`
- Automatically pre-populates with relevant exercises based on the workout session's name
- Dynamic "+ Add" button that instantly adds the exercise to the session and flips to a "✓ Added" state
- Real-time updates to session exercise counts, progress bar, and card grid

### `QuickNotes.tsx`

Exercise-specific personal reminders and form cues component:
- Displays user's private reminders (bench angle, seat position, form cues, preferred weights)
- Preserves multiline formatting with clean card display and lime accent bar
- Textarea with shortcut support (`Ctrl+Enter` / `⌘+Enter` to save) and error handling that prevents data loss
- Confirmation dialog for clearing notes to avoid accidental deletion
- Reusable on both the exercise detail page and inside workout session modals

### `FloatingTimer.tsx`

Persistent floating timer widget that automatically appears at the bottom-right of the viewport:
- Displays active rest timer countdown or running workout stopwatch across any page in the application
- Quick actions: Pause/Resume rest timer, +30s rest extension, and one-click expand to `/timer`
- Bouncing alert banner when rest timer completes with Dismiss and View buttons
- Automatically hidden on the dedicated `/timer` page to avoid redundancy

### `WorkoutHeatmap.tsx`

Active compact LeetCode-style 53-week daily activity contribution grid used on My Training:
- 53 weeks by 7 days with fixed 11px boxes; horizontal scrolling on narrow screens
- Click or keyboard-activate a day to inspect completed sessions, exercises, thumbnails, completion times, and notes
- Selected-day highlighting, empty-day feedback, and a close button; details appear only on selection inside a bounded scrolling panel
- Color intensity reflects sessions completed per day (0–4+)
- Month labels, weekday labels
- Stats: total sessions, active days, current day streak
- Auto-scrolls to today on mount
- Legend (Less → More)

---

## Data Flow Summary

1. **Dataset exercises (873)**: `exercises.json` → `exercises.ts` (Fuse.js) → `/api/exercises` → `SearchBar` / `ExerciseCard`
2. **Exercise detail**: `/exercise/[slug]` → `getBySlug()` → `ExerciseView` with `MovementViewer`
3. **AI generation**: User searches unknown exercise → `GenerateFlow` → `/api/generate` → `ai.ts` (Claude) → `cache.ts` → `ExerciseView` with `PoseFigure`
4. **Video**: `youtube.ts` resolves embed URL → `DeepDiveVideo` renders iframe; optionally `veo.ts` generates MP4
5. **Library**: `library.tsx` context → `localStorage` → favourites, workouts, progress, heatmap completions

---

## Environment Variables Summary

| Variable             | Required?              | Purpose                                          |
| -------------------- | ---------------------- | ------------------------------------------------ |
| `ANTHROPIC_API_KEY`  | Only for AI generation | Generates guides for exercises not in dataset     |
| `YOUTUBE_API_KEY`    | Optional               | Better YouTube video resolution (Data API v3)     |
| `GEMINI_API_KEY`     | Optional               | Veo deep-dive video generation                    |
| `GEMINI_VIDEO_MODEL` | Optional               | Override default Veo model                        |

---

## Running the Project

```bash
cd gym-visualizer
npm install
npm run setup      # downloads dataset → data/exercises.json
cp .env.example .env   # add API keys (optional)
npm run dev        # http://localhost:3000
```


## Custom Exercise Dataset

- Use **Create exercise** on Browse (`/search`) or inside a workout's exercise picker. Enter an exercise name and a YouTube video link, then save.
- Creating from a workout picker also adds the saved exercise to that workout. Browse adds it to the current results with a link to its detail page.
- `AddExerciseForm.tsx` preserves input on failure, shows validation errors and save progress, and confirms successful saves.
- `POST /api/exercises` validates the name (2-120 characters), accepts YouTube watch, short, shorts, live, and embed URLs, and rejects duplicate slugs with HTTP 409. Only validated YouTube video IDs are used in embeds.
- `src/lib/custom-exercises.ts` persists one JSON file per slug in `data/custom/`, using exclusive creation to prevent overwrites. Built-in exercise data is preserved. Custom records use `source: "custom"` and `youtubeVideoId`.
- Search, autocomplete, single-exercise lookup, and workout search merge custom records with the built-in dataset immediately. The bundled data remains cached; custom files are read on each lookup and included in the search index.
- Custom detail pages play the supplied YouTube demonstration, support favourites, notes, and workouts, and omit the photo movement viewer and unspecified muscles/instructions.
- Persistence requires a writable server filesystem. Local custom files survive server restarts. Read-only or ephemeral serverless hosting needs a persistent database/storage adapter for durable custom additions.

## Favourites Page (`src/app/favourites/page.tsx`)

Dedicated client page for saved exercises, moved out of My Training. Uses the existing `LibraryProvider` and localStorage data, preserving all saved favourites. Displays a count, responsive exercise card grid, loading state, and an empty state linking to Browse. Card hearts remove favourites immediately. My Training now focuses on workout sessions and daily activity history.

### Timer Page Controls

The `/timer` page opens directly to a single workout timer with elapsed time and Start, Pause, Resume, and Reset controls. The Rest Timer section, presets, custom rest modal, chime toggle, and view selector have been removed from this page. The shared timer context remains compatible with existing stored state.

## Spotify Music (`/spotify`)

- Navbar Spotify tab opens a saved music library with a Spotify share-link input and optional display name. Supports playlist, album, track, artist, podcast show, and episode URLs, including embed and localized URLs.
- `src/lib/spotify.ts` normalizes URLs and only allows HTTPS `open.spotify.com` resource URLs with valid 22-character IDs. Query strings are discarded; arbitrary iframe URLs and HTML are never accepted.
- `SpotifyProvider.tsx`, mounted in the root layout, owns saved links and a single persistent Spotify iframe player. Changing app routes keeps the player mounted. Compact/expanded modes and Close controls are available; closing or removing the active entry stops playback.
- Saved links persist in localStorage under `repvisual:spotify:v1`. Restored records are validated and deduplicated. Storage failures show feedback. Playback requires an explicit user action and is not resumed automatically on reload.
- `src/app/spotify/page.tsx` supports saving, selecting, removing, and opening resources in Spotify, with loading, validation, duplicate, and empty states.
- Uses Spotify's official embed iframe with autoplay, encrypted-media, fullscreen, clipboard-write, and picture-in-picture permissions. No Spotify API key or app OAuth flow is required for this integration; playback availability is controlled by Spotify.
- Reference: https://developer.spotify.com/documentation/embeds/tutorials/creating-an-embed

### Custom Exercise Covers

Custom exercises use their linked YouTube video's `https://i.ytimg.com/vi/<videoId>/hqdefault.jpg` as the cover. Covers are included in newly saved records, create-form results, search results, and exercise actions. Older custom dataset records receive the cover on read without manual migration. Exercise cards resolve missing covers for older workout/favourite snapshots and show a Video placeholder if the thumbnail fails to load. The thumbnail is a cover only; custom exercises still use the supplied video instead of a photo movement animation.

### Spotify Playlist Example

The Spotify page includes an inline 352px Beast Mode playlist embed so users can try playback and track selection immediately without pasting a link. "Keep this playlist while I train" saves/selects it in the persistent player. The example iframe unmounts while the persistent player is open to avoid simultaneous playback. Spotify handles login and preview/full-playback availability.

## Visual Design System

- Charcoal neutral surfaces (`ink-950` #111315 through `ink-600` #444c56), warm off-white text, and a restrained warm orange accent (`accent` #f49b62; soft #ffb384; deep #d9793b). Shared Tailwind accent tokens replace the former neon lime palette across pages and components.
- Inter typography, compact headings, small uppercase section labels, subtle borders, modest corner radii, minimal shadows, and consistent page spacing. Removed neon glows and prominent zoom effects.
- Navigation has route-aware active states, matching line icons, and five equal mobile targets. Desktop navigation sits beside the brand; mobile navigation uses a dedicated row below it.
- My Training uses a journal header, Browse shortcut, compact activity panel, and responsive session creation. Browse, Favourites, Timer, and Spotify share the same heading and surface treatment.
- Mobile layouts use smaller panel padding, wrapping controls, flexible session-name inputs, contained horizontal calendar scrolling, responsive exercise grids, and tabular timer numerals.
- Shared keyboard focus indicators, 16px mobile form controls to avoid input zoom, reduced-motion support, and dark native form controls.

Design validation: TypeScript passes; My Training, Browse, Favourites, Timer, and Spotify return HTTP 200. Compiled CSS includes the new palette, mobile navigation layout, and reduced-motion rules. The shared browser host was disconnected; responsive testing was subsequently completed using isolated headless Chrome (see Mobile Browser Validation below).

## Mobile Browser Validation

`tests/mobile-responsive.cjs` runs isolated headless Chrome with touch/mobile emulation against the local server. It seeds test-only localStorage without changing the user's normal browser data or server exercise records.

Viewport matrix: 320x568, 360x800, 390x844, 430x932, 768x1024, 568x320, 844x390, 1024x768, and 1440x900. Main-page checks cover My Training, Browse, Favourites, Timer, and Spotify. Interactive checks cover history, notes editing, session creation, exercise search and creation form inputs, stopwatch controls, persistent players, exercise details, and workout menus.

Issues found and fixed:
- Long workout names expanded the mobile layout; flex children now shrink and unbroken names wrap.
- Session creation squeezed its input on phones and overflowed at tablet widths; controls now use a two-column mobile grid, with collapse controls on a separate row and desktop alignment deferred until wider screens.
- Exercise cards use one column below 380px. Card action buttons have larger touch targets and cover badges sit away from them.
- Navigation targets are at least 44px across tested breakpoints. Inline add/filter controls and notes-close controls have larger touch targets.
- Notes dialogs have viewport-bounded scrolling for short landscape screens.
- Spotify and the stopwatch previously overlapped. A ResizeObserver measures the music dock so the timer stacks above it on phones. Short landscape screens use a reduced header and separate docks, with bounded iframe height.

Results and screenshots are stored in `artifacts/mobile/`; see `tests/README.md` for reproduction. Spotify/YouTube frame contents are stubbed during layout tests. Third-party playback and real-device Safari/Android keyboard behavior are outside this emulated-browser test.

Final responsive validation: 56 passing snapshots (45 main-page/viewport combinations and 11 interaction states), zero unresolved overflow/overlay collisions, and zero JavaScript runtime errors. Results combine the full viewport matrix with the focused interaction rerun after synchronizing Chrome resize rendering. TypeScript and whitespace checks passed. See `artifacts/mobile/README.md` and `report.json`.

## YouTube Media Presentation

Exercise video demonstrations are visible immediately on the detail page in a neutral charcoal panel and a black 16:9 player. Removed the orange-tinted video container, orange heading/launch button, collapsed state, and reveal animation. Native YouTube controls remain unobstructed; videos do not autoplay.

Exercise card covers no longer have a full-image dark gradient, and saved-heart/note indicators use neutral styling over media. Custom YouTube covers use a 16:9 area. The original thumbnail colors are preserved without filters or color tint overlays.

YouTube presentation verified in live headless Chrome at 320px, 390px, and 1280px: player visible immediately, native 16:9 dimensions, no app tint/filter, and no page overflow. The custom cover check also passes with original colors and no full-image overlay. Screenshots and results: `artifacts/youtube/`. The live YouTube thumbnail and native controls were visually inspected; playback was not initiated.

## Uniform Exercise Grids

All `ExerciseCard` covers use the same 16:9 aspect ratio, including built-in exercises, custom YouTube videos, and image placeholders. Images are positioned inside the reserved cover area so their native dimensions cannot change card height. Titles reserve two 20px lines and clamp overflow; metadata reserves one 16px line. Cards fill their grid cells, keeping titles, metadata, and row edges aligned. Workout note and completion controls use fixed 44px rows, and add-exercise tiles stretch to the same row height. Original thumbnail colors remain untinted.

Uniform-grid browser validation: Browse, Favourites, and My Training checked at 320px, 390px, 768px, and 1280px with mixed built-in/custom exercises and short/long names. Card heights, cover ratios, 40px title areas, and workout action row heights are measured for equality, with no horizontal overflow. Reproduce using `node tests/exercise-grid.cjs`; screenshots and results are in `artifacts/exercise-grid/`.

## Balanced Page Widths

Shared `.page-shell` gives My Training, Browse, Favourites, Spotify, Timer, exercise details, navigation, footer, and generation fallback consistent centered alignment. It uses a 1600px maximum width, with 16px phone, 24px tablet, 40px smaller-desktop, and 48px wide-desktop inner gutters. Large monitors retain additional outer margins. This reduces the previous excessive side gaps without an edge-to-edge layout. Exercise grids scale to five columns at 1280px and six at 1536px, retaining uniform cards. Dialogs and short text blocks keep their own readable widths.

## Vercel Build and Deployment

- `package.json` pins Node.js 22.x and adds `prebuild`, `vercel-build`, `typecheck`, and preview/production CLI deployment scripts.
- `prebuild` uses `scripts/fetch-dataset.mjs --if-missing` to validate/reuse bundled data and download it only when absent. Explicit `npm run setup` still refreshes the dataset.
- `vercel.json` selects Next.js, `npm ci`, and `npm run vercel-build`; output directory and Next.js function routing remain framework-managed.
- `.vercelignore` excludes test artifacts, browser tests, local credentials, and development/cache directories from CLI uploads. `.vercel/` project-link metadata is git-ignored.
- Set optional provider API keys in Vercel environment settings. No database provisioning or remote deployment is performed by writing these scripts.
- Built-in data and committed custom exercise files are bundled for reads. Browser-local workouts/favourites do not require a database. Runtime custom-exercise creation requires durable external storage; local JSON writes cannot persist on Vercel. Temporary caches and legacy generated MP4 storage also have hosting limitations documented in README.md.

The default `/` redirect is also defined in `next.config.mjs` so production returns an HTTP 307 with `Location: /library` before static-page handling. The root page retains its redirect as a fallback.

## Compact Session Defaults and Page Copy

Workout sessions start collapsed, including newly created sessions. The collapsed state defaults to true for IDs without a local override; individual and Expand all/Collapse all controls explicitly toggle that state. Collapsed rows show the session name, exercise count, and progress; exercise management controls appear after expansion.

Removed decorative taglines, eyebrow text, repeated instructions, and long introductions from the navigation, training dashboard, activity calendar, Browse, Favourites, Timer, Spotify, video panels, and footer. Mobile training headers are shorter, the redundant Browse shortcut is desktop-only, and empty-state text is concise. Input labels, validation messages, session progress, useful Spotify link instructions, and attribution remain.

## Weekly Schedule Notepad

`WeeklySchedule.tsx` appears on My Training between Training Activity and Your Sessions. It provides a resizable, multiline Monday-Sunday notepad with a seven-day starter template. Edits save immediately to browser localStorage under `repvisual:weekly-schedule:v1`, including deliberately blank schedules, and restore on reload. A small Saved status confirms persistence; storage/load errors remain visible without clearing the draft. The schedule is browser-local and does not sync across devices. The editor uses 16px mobile text and full-width responsive sizing.
