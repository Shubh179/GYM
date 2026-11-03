"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const ECHOPLAY_URL = "https://echoplay.vercel.app/";
interface MusicContextValue {
  isOpen: boolean;
  playerHeight: number;
  open: () => void;
}
const Context = createContext<MusicContextValue | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [playerHeight, setPlayerHeight] = useState(0);
  const playerRef = useRef<HTMLElement>(null);
  const open = useCallback(() => { setIsOpen(true); setExpanded(true); }, []);

  useEffect(() => {
    const element = playerRef.current;
    if (!element) { setPlayerHeight(0); return; }
    const observer = new ResizeObserver(() => setPlayerHeight(element.getBoundingClientRect().height));
    observer.observe(element);
    return () => observer.disconnect();
  }, [isOpen]);

  return <Context.Provider value={{ isOpen, playerHeight, open }}>
    {children}
    {isOpen && <aside ref={playerRef} aria-label="EchoPlay player" className={`music-floating-player fixed bottom-4 left-4 z-40 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/15 bg-ink-950 shadow-2xl ${expanded ? "w-[900px]" : "w-[360px]"}`}>
      <div className="flex min-h-12 items-center justify-between gap-2 px-3 py-1">
        <span className="text-xs font-semibold text-accent">EchoPlay</span>
        <div className="flex items-center gap-3 text-xs text-white/70">
          <button className="min-h-11 px-1" type="button" aria-expanded={expanded} aria-controls="echoplay-frame" onClick={() => setExpanded(value => !value)}>{expanded ? "Minimize" : "Expand"}</button>
          <button className="min-h-11 px-1" type="button" aria-label="Close EchoPlay player and stop playback" onClick={() => setIsOpen(false)}>Close</button>
        </div>
      </div>
      <iframe id="echoplay-frame" src={ECHOPLAY_URL} title="EchoPlay music" width="100%"
        className={`music-frame border-0 ${expanded ? "block h-[min(65dvh,640px)]" : "hidden"}`}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
    </aside>}
  </Context.Provider>;
}

export function useMusic() {
  const value = useContext(Context);
  if (!value) throw new Error("useMusic must be used inside MusicProvider");
  return value;
}
