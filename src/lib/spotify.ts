export interface SpotifyItem {
  key: string;
  type: string;
  id: string;
  url: string;
  embedUrl: string;
}

export function parseSpotifyLink(value: string): SpotifyItem | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.hostname !== "open.spotify.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (/^intl-[a-z]{2}$/i.test(parts[0] ?? "")) parts.shift();
    if (parts[0] === "embed") parts.shift();
    const [type, id] = parts;
    if (parts.length !== 2 || !["playlist", "album", "track", "artist", "show", "episode"].includes(type) || !/^[a-zA-Z0-9]{22}$/.test(id ?? "")) return null;
    return { key: `${type}/${id}`, type, id, url: `https://open.spotify.com/${type}/${id}`, embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0` };
  } catch { return null; }
}
