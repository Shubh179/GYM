"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { parseSpotifyLink, type SpotifyItem } from "@/lib/spotify";

type SavedItem = SpotifyItem & { name: string };
interface SpotifyContextValue {
  items: SavedItem[];
  hydrated: boolean;
  activeKey: string | null;
  playerHeight: number;
  add: (url: string, name: string) => string | null;
  play: (key: string) => void;
  remove: (key: string) => void;
  error: string;
}
const Context = createContext<SpotifyContextValue | null>(null);
const STORAGE_KEY = "repvisual:spotify:v1";

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [playerHeight, setPlayerHeight] = useState(0);
  const playerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = playerRef.current;
    if (!element) { setPlayerHeight(0); return; }
    const measure = () => setPlayerHeight(element.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [activeKey]);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(raw)) {
        const restored: SavedItem[] = [];
        for (const value of raw) {
          if (!value || typeof value.url !== "string") continue;
          const item = parseSpotifyLink(value.url);
          if (item && !restored.some(saved => saved.key === item.key)) restored.push({ ...item, name: typeof value.name === "string" ? value.name.slice(0, 80) : item.type });
        }
        setItems(restored);
      }
    } catch { setError("Saved music could not be loaded on this device."); }
    setHydrated(true);
  }, []);
  function persist(next: SavedItem[]) {
    setItems(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setError(""); }
    catch { setError("Music is available for this visit, but could not be saved on this device."); }
  }
  function add(url: string, name: string): string | null {
    const item = parseSpotifyLink(url);
    if (!item) return "Paste a Spotify share link from open.spotify.com for a playlist, album, track, artist, podcast, or episode.";
    if (items.some(saved => saved.key === item.key)) return "This Spotify link is already saved. Select Play below.";
    persist([{ ...item, name: name.trim().slice(0, 80) || `My ${item.type === "show" ? "podcast" : item.type}` }, ...items]);
    setActiveKey(item.key);
    return null;
  }
  function remove(key: string) {
    if (activeKey === key) setActiveKey(null);
    persist(items.filter(item => item.key !== key));
  }
  const active = items.find(item => item.key === activeKey);
  return <Context.Provider value={{ items, hydrated, activeKey, playerHeight, add, remove, play: setActiveKey, error }}>
    {children}
    {active && <aside ref={playerRef} aria-label="Spotify player" className="spotify-floating-player fixed bottom-4 left-4 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/15 bg-ink-950 shadow-2xl">
      <div className="flex min-h-11 items-center justify-between gap-2 px-3 py-1">
        <span className="truncate text-xs font-semibold text-accent">Spotify: {active.name}</span>
        <div className="flex shrink-0 gap-3 text-xs text-white/70">
          <button className="min-h-11 px-1" type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Compact" : "Expand"}</button>
          <button className="min-h-11 px-1" type="button" aria-label="Close Spotify player and stop playback" onClick={() => setActiveKey(null)}>Close</button>
        </div>
      </div>
      <iframe key={active.key} src={active.embedUrl} title={`Spotify: ${active.name}`} width="100%" height={expanded ? 352 : 152}
        className="block max-h-[calc(100dvh-17rem)] border-0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
    </aside>}
  </Context.Provider>;
}
export function useSpotify() {
  const value = useContext(Context);
  if (!value) throw new Error("useSpotify must be used inside SpotifyProvider");
  return value;
}
