import { parseCustomExerciseInput } from "@/lib/custom-exercise-input";
import { exerciseAccess, ExerciseStorageUnavailableError } from "@/lib/supabase-server";
import { readCustomExercises, saveCustomExercise } from "@/lib/custom-exercises";
import { getBySlug, slugify } from "@/lib/exercises";
import type { Exercise } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { MUSCLE_TARGETS } from "@/lib/muscle-targets";
import {
  searchExercises,
  byMuscle,
  byTarget,
  listMuscles,
  popularExercises,
} from "@/lib/exercises";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const muscle = searchParams.get("muscle");
  const target = searchParams.get("target");
  const mode = searchParams.get("mode");

  if (mode === "custom") {
    try {
      const exercises = await readCustomExercises({ requireRemote: true });
      return NextResponse.json({ results: exercises.map(exercise => ({
        slug: exercise.slug, name: exercise.name, level: exercise.level, equipment: exercise.equipment,
        category: exercise.category, primaryMuscles: exercise.primaryMuscles, targetAreas: exercise.targetAreas ?? [],
        thumbUrl: exercise.imageUrls[0] ?? null,
      })) }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return NextResponse.json({ error: "Exercise storage is not available." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  }
  if (mode === "muscles") {
    return NextResponse.json({ muscles: await listMuscles() });
  }
  if (mode === "popular") {
    return NextResponse.json({ results: await popularExercises() });
  }
  if (target !== null) {
    if (!MUSCLE_TARGETS.some(item => item.id === target)) {
      return NextResponse.json({ error: "Unknown muscle target." }, { status: 400 });
    }
    return NextResponse.json({ results: await byTarget(target) });
  }
  if (muscle) {
    return NextResponse.json({ results: await byMuscle(muscle) });
  }
  return NextResponse.json({ results: await searchExercises(q) });
}

export async function POST(req: NextRequest) {
  const access = await exerciseAccess(req.headers.get("authorization"));
  if (!access.canCreate) {
    return NextResponse.json({ error: !access.configured ? "Exercise publishing is not configured yet." : access.signedIn ? "This account is not allowed to add exercises." : "Sign in to add an exercise." },
      { status: !access.configured ? 503 : access.signedIn ? 403 : 401 });
  }
  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const input = parseCustomExerciseInput(body);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });
  const { name, videoId, targetAreas, primaryMuscles } = input;
  const slug = slugify(name);
  try {
    if (await getBySlug(slug)) return NextResponse.json({ error: "An exercise with this name already exists. Choose a different name." }, { status: 409 });
    const exercise: Exercise = {
      id: `custom-${slug}`, slug, name, source: "custom", youtubeVideoId: videoId,
      level: "custom", category: "custom", equipment: null, mechanic: null, force: null,
      primaryMuscles, targetAreas, secondaryMuscles: [], instructions: [], imageUrls: [`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`],
    };
    const saved = await saveCustomExercise(exercise);
    return NextResponse.json({ exercise: saved }, { status: 201 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return NextResponse.json({ error: "An exercise with this name already exists." }, { status: 409 });
    if (error instanceof ExerciseStorageUnavailableError) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error("Could not save custom exercise.");
    return NextResponse.json({ error: "Could not save the exercise. Please try again." }, { status: 500 });
  }
}
