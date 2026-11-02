import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SECRET_KEY?.trim();
if (!url || !key) throw new Error("Set the Supabase URL and server secret in .env.local first.");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const directory = path.join(process.cwd(), "data", "custom");
let files;
try { files = await readdir(directory); }
catch (error) { if (error.code === "ENOENT") files = []; else throw error; }
const rows = [];
for (const file of files.filter(file => file.endsWith(".json"))) {
  const exercise = JSON.parse(await readFile(path.join(directory, file), "utf8"));
  if (!exercise.name?.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(exercise.slug ?? "") || !/^[a-zA-Z0-9_-]{11}$/.test(exercise.youtubeVideoId ?? "")) {
    throw new Error(`Invalid custom exercise record in ${file}.`);
  }
  rows.push({ name: exercise.name, slug: exercise.slug, youtube_video_id: exercise.youtubeVideoId });
}
if (process.argv.includes("--dry-run")) {
  console.log(`Found ${rows.length} valid custom exercise(s) for import. No database changes made.`);
} else if (rows.length) {
  const { data, error } = await client.from("custom_exercises").upsert(rows, { onConflict: "slug", ignoreDuplicates: true })
    .select("slug").abortSignal(AbortSignal.timeout(15000));
  if (error) {
    console.error(`Import failed (database code ${error.code || "unknown"}). Check the table, permissions, and server secret.`);
    process.exitCode = 1;
  } else {
    console.log(`Imported ${data?.length ?? 0} exercise(s); existing slugs were preserved. Local files were not removed.`);
  }
} else { console.log("No local custom exercises to import."); }
