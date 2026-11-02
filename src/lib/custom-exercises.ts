import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Exercise } from "./types";
const directory = path.join(process.cwd(), "data", "custom");
export async function readCustomExercises(): Promise<Exercise[]> {
  let files: string[];
  try { files = await readdir(directory); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return Promise.all(files.filter(file => file.endsWith(".json")).map(async file =>
    {
      const exercise = JSON.parse(await readFile(path.join(directory, file), "utf8")) as Exercise;
      return withYoutubeCover(exercise);
    }));
}
function withYoutubeCover(exercise: Exercise): Exercise {
  return exercise.youtubeVideoId && /^[a-zA-Z0-9_-]{11}$/.test(exercise.youtubeVideoId)
    ? { ...exercise, imageUrls: [`https://i.ytimg.com/vi/${exercise.youtubeVideoId}/hqdefault.jpg`] }
    : exercise;
}
export async function saveCustomExercise(exercise: Exercise) {
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${exercise.slug}.json`), JSON.stringify(withYoutubeCover(exercise), null, 2), { flag: "wx" });
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
