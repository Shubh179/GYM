import { parseCustomExerciseInput } from "@/lib/custom-exercise-input";
import { updateCustomExercise } from "@/lib/custom-exercises";
import { exerciseAccess, ExerciseStorageUnavailableError } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import { getBySlug, invalidateExerciseCatalog } from "@/lib/exercises";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  const dataset = await getBySlug(slug);
  if (dataset) {
    return NextResponse.json({ status: "found", exercise: dataset });
  }

  return NextResponse.json({ status: "missing", error: "Exercise not found." }, { status: 404 });
}

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const access = await exerciseAccess(req.headers.get("authorization"));
  if (!access.canCreate) {
    return NextResponse.json({ error: !access.configured ? "Exercise publishing is not configured yet." : access.signedIn ? "This account is not allowed to edit exercises." : "Sign in to edit an exercise." },
      { status: !access.configured ? 503 : access.signedIn ? 403 : 401 });
  }
  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const input = parseCustomExerciseInput(body);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });
  try {
    const exercise = await updateCustomExercise(params.slug, {
      name: input.name, youtubeVideoId: input.videoId, primaryMuscles: input.primaryMuscles, targetAreas: input.targetAreas,
    });
    if (!exercise) return NextResponse.json({ error: "Custom exercise not found. Built-in exercises cannot be edited." }, { status: 404 });
    invalidateExerciseCatalog();
    return NextResponse.json({ exercise }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ExerciseStorageUnavailableError) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error("Could not update custom exercise.");
    return NextResponse.json({ error: "Could not save changes. Please try again." }, { status: 500 });
  }
}
