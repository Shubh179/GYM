// Pure YouTube embed helpers — NO node/server imports, safe for client + server.
//
// We embed demonstrations inline via the privacy-friendly youtube-nocookie host
// so the clip plays on our own page instead of sending the user off to YouTube.

// Build a focused query that surfaces a clear "how to" demonstration clip.
// `context` (e.g. the primary muscle) disambiguates names that collide with
// unrelated content — "Butterfly" the chest machine vs. the yoga pose, etc.
export function searchQuery(name: string, context?: string): string {
  const extra = context?.trim() ? ` ${context.trim()}` : "";
  return `${name}${extra} exercise how to proper form`;
}

// Keyless inline embed: YouTube's `listType=search` plays the top match for the
// query right inside our iframe — no API key, no cost. Reliability can vary, so
// a YOUTUBE_API_KEY (see src/lib/youtube.ts) upgrades this to a resolved video.
export function searchEmbedUrl(name: string, context?: string): string {
  const q = encodeURIComponent(searchQuery(name, context));
  return `https://www.youtube-nocookie.com/embed?listType=search&list=${q}&rel=0&playsinline=1`;
}

// Embed a specific resolved video id (preferred when we have one).
export function watchEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`;
}
