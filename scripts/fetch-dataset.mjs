// Downloads the free-exercise-db dataset into data/exercises.json
// Run with: npm run setup
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const OUT_FILE = path.join(DATA_DIR, "exercises.json");

const SOURCE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

async function main() {
  if (process.argv.includes("--if-missing") && existsSync(OUT_FILE)) {
    const existing = JSON.parse(await readFile(OUT_FILE, "utf8"));
    const list = Array.isArray(existing) ? existing : existing.exercises;
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error("Bundled exercise dataset is invalid. Run npm run setup to refresh it.");
    }
    console.log(`Using bundled dataset (${list.length} exercises).`);
    return;
  }
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });

  console.log(`Fetching dataset from ${SOURCE} ...`);
  const res = await fetch(SOURCE);
  if (!res.ok) {
    throw new Error(`Failed to fetch dataset: HTTP ${res.status}`);
  }
  const json = await res.json();
  const list = Array.isArray(json) ? json : json.exercises;
  if (!Array.isArray(list)) {
    throw new Error("Unexpected dataset shape — expected an array of exercises.");
  }

  await writeFile(OUT_FILE, JSON.stringify(list), "utf8");
  const withImages = list.filter((e) => e.images && e.images.length > 0).length;
  console.log(`Saved ${list.length} exercises (${withImages} with images) to data/exercises.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
