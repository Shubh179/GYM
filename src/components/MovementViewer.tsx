"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SvgPose } from "@/lib/types";
import PoseFigure from "./PoseFigure";

interface Props {
  imageUrls: string[];
  pose?: SvgPose | null;
  name: string;
}

const SPEEDS = [0.5, 1, 1.5, 2];

export default function MovementViewer({ imageUrls, pose, name }: Props) {
  const hasPhotos = imageUrls.length >= 2;
  const hasPose = Boolean(pose);
  const [t, setT] = useState(0); // 0 = start, 1 = finish
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  // Oscillate t between 0 and 1 using a cosine ease for a natural rep.
  const animate = useCallback(
    (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = (ts - startRef.current) / 1000;
      const period = 2.4 / speed; // seconds for a full start->finish->start cycle
      const phase = (elapsed % period) / period; // 0..1
      const eased = (1 - Math.cos(phase * 2 * Math.PI)) / 2; // 0->1->0
      setT(eased);
      rafRef.current = requestAnimationFrame(animate);
    },
    [speed]
  );

  useEffect(() => {
    if (!playing) return;
    startRef.current = null;
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, animate]);
  // PLACEHOLDER_BODY
  function onScrub(value: number) {
    setPlaying(false);
    setT(value);
  }

  const phaseLabel = t < 0.33 ? "Start" : t > 0.67 ? "Finish" : "Mid-rep";

  if (!hasPhotos && !hasPose) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-white/10 bg-ink-850 text-white/50">
        No visualization available.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-card">
      <div className="relative aspect-square w-full bg-gradient-to-b from-ink-800 to-ink-950">
        {hasPhotos ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrls[0]}
              alt={`${name} — start position`}
              className="absolute inset-0 h-full w-full object-contain"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrls[1]}
              alt={`${name} — finish position`}
              style={{ opacity: t }}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </>
        ) : (
          pose && <PoseFigure pose={pose} t={t} />
        )}

        <div className="pointer-events-none absolute left-4 top-4 flex gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              t < 0.5
                ? "bg-accent text-ink-950"
                : "bg-ink-950/70 text-white/60 backdrop-blur"
            }`}
          >
            Start
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              t >= 0.5
                ? "bg-accent text-ink-950"
                : "bg-ink-950/70 text-white/60 backdrop-blur"
            }`}
          >
            Finish
          </span>
        </div>
        <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-ink-950/70 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur">
          {phaseLabel}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-white/10 bg-ink-900/60 p-4">
        <button
          onClick={() => {
            if (!playing) startRef.current = null;
            setPlaying((p) => !p);
          }}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-ink-950 transition hover:bg-accent-soft"
        >
          {playing ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={t}
          onChange={(e) => onScrub(parseFloat(e.target.value))}
          aria-label="Scrub between start and finish"
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-ink-700 accent-accent"
        />

        <div className="flex shrink-0 items-center gap-1 rounded-full bg-ink-800 p-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                speed === s ? "bg-accent text-ink-950" : "text-white/50 hover:text-white"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
