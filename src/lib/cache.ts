import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { GeneratedExercise } from "./types";

// AI-generated exercises are cached to disk so a repeat view is instant.
//
// On a normal machine (local dev) the bundled `data/generated` dir is writable
// and entries persist in the repo. On a serverless host (Vercel) the deployment
// filesystem is read-only, so runtime writes go to the OS temp dir instead —
// which persists for the life of a warm Lambda. Reads check both locations.

const BUNDLED_DIR = path.join(process.cwd(), "data", "generated");
const TMP_DIR = path.join(os.tmpdir(), "repvisual-generated");

function fileIn(dir: string, slug: string): string {
  return path.join(dir, `${slug}.json`);
}

export async function readCached(slug: string): Promise<GeneratedExercise | null> {
  for (const dir of [BUNDLED_DIR, TMP_DIR]) {
    const file = fileIn(dir, slug);
    if (!existsSync(file)) continue;
    try {
      return JSON.parse(await readFile(file, "utf8")) as GeneratedExercise;
    } catch {
      // Corrupt file — try the next location.
    }
  }
  return null;
}

export async function writeCached(exercise: GeneratedExercise): Promise<void> {
  // Try the bundled dir first (persists in the repo during local dev); if that
  // fails because the filesystem is read-only (serverless), fall back to /tmp.
  for (const dir of [BUNDLED_DIR, TMP_DIR]) {
    try {
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
      await writeFile(
        fileIn(dir, exercise.slug),
        JSON.stringify(exercise, null, 2),
        "utf8",
      );
      return;
    } catch {
      // Read-only or otherwise unwritable — try the next location.
    }
  }
  // Both failed: caching is best-effort, so just skip it silently.
}
