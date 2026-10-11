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
  // Provide nearest fuzzy matches as a helpful fallback.
  const readable = slug.replace(/-/g, " ");
  const suggestions = await searchExercises(readable, 6);
  return NextResponse.json({ status: "missing", suggestions });
}
