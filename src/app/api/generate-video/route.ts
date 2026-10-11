import { NextRequest, NextResponse } from "next/server";
import { getBySlug } from "@/lib/exercises";
import { readCached } from "@/lib/cache";
import { deepDiveVideoFor } from "@/lib/video";
import { generateDeepDiveVideo, MissingVideoKeyError } from "@/lib/veo";

// Veo generation is a long-running operation (often 1-3 minutes). Give the
// route a generous ceiling. On serverless hosts the platform cap still applies
// (e.g. Vercel) — for long clips run locally or on a host without a hard limit.
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

  // Already generated/available? Return instantly.
  const existing = deepDiveVideoFor(slug);
  if (existing) {
    return NextResponse.json({ status: "cached", videoUrl: existing });
  }

  // Resolve the exercise (dataset first, then any cached AI guide) so we can
  // build a muscle-aware prompt.
  const exercise = (await getBySlug(slug)) ?? (await readCached(slug));
  if (!exercise) {
    return NextResponse.json(
      { error: "Unknown exercise." },
      { status: 404 }
    );
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
