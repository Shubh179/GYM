import { saveCustomExercise, youtubeVideoId } from "@/lib/custom-exercises";
import { getBySlug, slugify } from "@/lib/exercises";
import type { Exercise } from "@/lib/types";
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

export async function POST(req: NextRequest) {
  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const videoId = typeof body?.youtubeUrl === "string" ? youtubeVideoId(body.youtubeUrl.trim()) : null;
  const slug = slugify(name);
  if (name.length < 2 || name.length > 120 || !slug || slug.length > 120) {
    return NextResponse.json({ error: "Enter an exercise name between 2 and 120 characters, including a letter or number." }, { status: 400 });
  }
  if (!videoId) return NextResponse.json({ error: "Enter a valid YouTube video link." }, { status: 400 });
  try {
    if (await getBySlug(slug)) return NextResponse.json({ error: "An exercise with this name already exists. Choose a different name." }, { status: 409 });
    const exercise: Exercise = {
      id: `custom-${slug}`, slug, name, source: "custom", youtubeVideoId: videoId,
      level: "custom", category: "custom", equipment: null, mechanic: null, force: null,
      primaryMuscles: [], secondaryMuscles: [], instructions: [], imageUrls: [`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`],
    };
    await saveCustomExercise(exercise);
    return NextResponse.json({ exercise }, { status: 201 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return NextResponse.json({ error: "An exercise with this name already exists." }, { status: 409 });
    console.error("Could not save custom exercise", error);
    return NextResponse.json({ error: "Could not save the exercise. Please try again." }, { status: 500 });
  }
}
