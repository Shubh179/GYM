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
