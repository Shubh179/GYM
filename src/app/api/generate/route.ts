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
