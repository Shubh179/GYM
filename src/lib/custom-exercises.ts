import "server-only";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Exercise } from "./types";
import { createServerSupabase, ExerciseStorageUnavailableError, supabaseConfigured } from "./supabase-server";

const directory = path.join(process.cwd(), "data", "custom");
interface CustomRow { id: string; name: string; slug: string; youtube_video_id: string; }
const columns = "id,name,slug,youtube_video_id";

function withYoutubeCover(exercise: Exercise): Exercise {
  return exercise.youtubeVideoId && /^[a-zA-Z0-9_-]{11}$/.test(exercise.youtubeVideoId)
    ? { ...exercise, imageUrls: [`https://i.ytimg.com/vi/${exercise.youtubeVideoId}/hqdefault.jpg`] }
    : exercise;
}

function fromRow(row: CustomRow): Exercise {
  return withYoutubeCover({
    id: row.id, name: row.name, slug: row.slug, youtubeVideoId: row.youtube_video_id,
    source: "custom", level: "custom", category: "custom", equipment: null, mechanic: null, force: null,
    primaryMuscles: [], secondaryMuscles: [], instructions: [], imageUrls: [],
  });
}

async function bundledExercises(): Promise<Exercise[]> {
  let files: string[];
  try { files = await readdir(directory); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return Promise.all(files.filter(file => file.endsWith(".json")).map(async file =>
    withYoutubeCover(JSON.parse(await readFile(path.join(directory, file), "utf8")) as Exercise)));
}

export async function readCustomExercises(): Promise<Exercise[]> {
  const bundled = await bundledExercises();
  if (!supabaseConfigured()) return bundled;
  try {
    const client = createServerSupabase();
    const remote: Exercise[] = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await client.from("custom_exercises").select(columns)
        .order("created_at", { ascending: false }).order("id")
        .range(offset, offset + pageSize - 1).abortSignal(AbortSignal.timeout(10000));
      if (error) throw new ExerciseStorageUnavailableError();
      const rows = (data ?? []) as CustomRow[];
      remote.push(...rows.map(fromRow));
      if (rows.length < pageSize) break;
    }
    const merged = new Map(remote.map(exercise => [exercise.slug, exercise]));
    for (const exercise of bundled) if (!merged.has(exercise.slug)) merged.set(exercise.slug, exercise);
    return [...merged.values()];
  } catch {
    // A database outage must not prevent browsing the bundled exercise catalog.
    console.warn("Custom exercise database unavailable; using bundled exercises.");
    return bundled;
  }
}

export async function saveCustomExercise(exercise: Exercise): Promise<Exercise> {
  if (supabaseConfigured()) {
    const { data, error } = await createServerSupabase(true).from("custom_exercises").insert({
      name: exercise.name, slug: exercise.slug, youtube_video_id: exercise.youtubeVideoId,
    }).select(columns).abortSignal(AbortSignal.timeout(10000)).single();
    if (error?.code === "23505") throw Object.assign(new Error("Exercise already exists."), { code: "EEXIST" });
    if (error || !data) throw new ExerciseStorageUnavailableError();
    return fromRow(data as CustomRow);
  }
  if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") throw new ExerciseStorageUnavailableError();
  await mkdir(directory, { recursive: true });
  const covered = withYoutubeCover(exercise);
  await writeFile(path.join(directory, `${exercise.slug}.json`), JSON.stringify(covered, null, 2), { flag: "wx" });
  return covered;
}

export function youtubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/")[1];
    if (["youtube.com", "youtube-nocookie.com"].includes(host)) {
      const parts = url.pathname.split("/");
      id = url.pathname === "/watch" ? url.searchParams.get("v") :
        ["shorts", "embed", "live"].includes(parts[1]) ? parts[2] : null;
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}
