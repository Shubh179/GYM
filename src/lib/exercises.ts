import { exerciseTargets } from "./muscle-targets";
import { readCustomExercises } from "./custom-exercises";
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
async function loadRaw(): Promise<Exercise[]> {
  const file = path.join(process.cwd(), "data", "exercises.json");
  const text = await readFile(file, "utf8");
  const json = JSON.parse(text) as RawExercise[] | { exercises: RawExercise[] };
  const list = Array.isArray(json) ? json : json.exercises;
  return list.map(normalize);
}

export async function getAllExercises(): Promise<Exercise[]> {
  if (!exercisesCache) exercisesCache = await loadRaw();
  return [...await readCustomExercises(), ...exercisesCache];
}

export async function getBySlug(slug: string): Promise<Exercise | null> {
  return (await getAllExercises()).find((exercise) => exercise.slug === slug) ?? null;
}

async function getFuse(): Promise<Fuse<Exercise>> {
  return new Fuse(await getAllExercises(), {
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
}

function toSearchResult(e: Exercise): SearchResult {
  return {
    slug: e.slug,
    name: e.name,
    level: e.level,
    equipment: e.equipment,
    category: e.category,
    primaryMuscles: e.primaryMuscles,
    targetAreas: exerciseTargets(e),
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
