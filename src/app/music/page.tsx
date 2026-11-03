"use client";

import { useEffect } from "react";
import { useMusic } from "@/components/MusicProvider";

export default function MusicPage() {
  const { isOpen, open } = useMusic();
  useEffect(() => { open(); }, [open]);

  return <div className="page-shell pb-24 pt-10">
    <h1 className="page-title">Music</h1>
    <section aria-label="EchoPlay music" className="mt-8 rounded-2xl border border-accent/20 bg-ink-850 p-5 sm:p-6">
      <h2 className="font-display text-xl font-bold text-white">EchoPlay</h2>
      <p className="mt-2 text-sm text-white/60">Search songs and play music while you train.</p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" onClick={open} className="min-h-11 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-ink-950">{isOpen ? "Expand EchoPlay" : "Open EchoPlay"}</button>
        <a href="https://echoplay.vercel.app/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm text-accent underline">Open in new tab</a>
      </div>
      <p className="mt-4 text-sm text-white/50">Minimize the player to keep listening as you browse workouts. Close stops playback.</p>
      <p className="mt-2 text-xs text-white/40">If the player does not load, try opening EchoPlay in a new tab.</p>
    </section>
  </div>;
}
