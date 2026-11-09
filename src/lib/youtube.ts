import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { searchQuery, watchEmbedUrl } from "./youtube-embed";

// Server-side YouTube resolution. Resolves ONE concrete, embeddable video id per
// exercise (embedding by id is reliable; the keyless `listType=search` embed is
// deprecated and shows "Video unavailable"). Results cache to
// data/videos/<slug>.json so each exercise is only resolved once.
//
// Two resolvers, in order of preference:
//   1. YouTube Data API v3 (if YOUTUBE_API_KEY is set) — sanctioned, free quota.
//   2. Scrape the public search results page (no key) — grabs the first videoId.

const VIDEOS_DIR = path.join(process.cwd(), "data", "videos");
// On a read-only serverless filesystem (Vercel) runtime writes go to /tmp,
// which persists for the life of a warm Lambda. Reads check both locations.
const TMP_VIDEOS_DIR = path.join(os.tmpdir(), "repvisual-videos");

interface CachedVideo {
  slug: string;
  videoId: string;
  title?: string;
  via: "api" | "scrape";
  resolvedAt: string;
}

function cachePath(dir: string, slug: string): string {
  return path.join(dir, `${slug}.json`);
}

async function readCachedVideo(slug: string): Promise<CachedVideo | null> {
  for (const dir of [VIDEOS_DIR, TMP_VIDEOS_DIR]) {
    const file = cachePath(dir, slug);
    if (!existsSync(file)) continue;
    try {
      return JSON.parse(await readFile(file, "utf8")) as CachedVideo;
    } catch {
      // Corrupt file — try the next location.
    }
  }
  return null;
}

async function writeCachedVideo(v: CachedVideo): Promise<void> {
  // Prefer the bundled dir (committable in local dev); fall back to /tmp when
  // the deployment filesystem is read-only. Best-effort — never throws.
  for (const dir of [VIDEOS_DIR, TMP_VIDEOS_DIR]) {
    try {
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
      await writeFile(cachePath(dir, v.slug), JSON.stringify(v, null, 2), "utf8");
      return;
    } catch {
      // Read-only or otherwise unwritable — try the next location.
    }
  }
}

// Resolver 1: YouTube Data API v3 (requires key).
async function resolveViaApi(
  name: string,
  context?: string,
): Promise<{ videoId: string; title?: string } | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", searchQuery(name, context));
    url.searchParams.set("type", "video");
    url.searchParams.set("videoEmbeddable", "true");
    url.searchParams.set("maxResults", "1");
    url.searchParams.set("safeSearch", "strict");
    url.searchParams.set("key", key);

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      items?: { id?: { videoId?: string }; snippet?: { title?: string } }[];
    };
    const item = data.items?.[0];
    const videoId = item?.id?.videoId;
    if (!videoId) return null;
    return { videoId, title: item?.snippet?.title };
  } catch {
    return null;
  }
}

// Resolver 2: scrape the public search results page for the first videoId.
async function resolveViaScrape(
  name: string,
  context?: string,
): Promise<{ videoId: string } | null> {
  try {
    const q = encodeURIComponent(searchQuery(name, context));
    const res = await fetch(`https://www.youtube.com/results?search_query=${q}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    const videoId = match?.[1];
    if (!videoId) return null;
    return { videoId };
  } catch {
    return null;
  }
}

export interface ResolveVideoInput {
  slug: string;
  name: string;
  // Optional disambiguating context (e.g. primary muscle) folded into the query.
  context?: string;
}

// Returns an embeddable youtube-nocookie URL, or null if nothing could be
// resolved (page then falls back to the keyless search embed as a last resort).
export async function resolveExerciseVideo({
  slug,
  name,
  context,
}: ResolveVideoInput): Promise<string | null> {
  const cached = await readCachedVideo(slug);
  if (cached) return watchEmbedUrl(cached.videoId);

  const api = await resolveViaApi(name, context);
  if (api) {
    await writeCachedVideo({
      slug,
      videoId: api.videoId,
      title: api.title,
      via: "api",
      resolvedAt: new Date().toISOString(),
    });
    return watchEmbedUrl(api.videoId);
  }

  const scraped = await resolveViaScrape(name, context);
  if (scraped) {
    await writeCachedVideo({
      slug,
      videoId: scraped.videoId,
      via: "scrape",
      resolvedAt: new Date().toISOString(),
    });
    return watchEmbedUrl(scraped.videoId);
  }

  return null;
}
